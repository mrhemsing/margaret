import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendExampleVoicemailAlertSmsToTeam } from "@/lib/sms/twilio";
import { getServerEnv } from "@/lib/env";
import { buildCompanionContext, buildCurrentConversationContext } from "@/lib/voice/companion-context";
import { getCachedCallCurrentContext } from "@/lib/voice/current-info";
import {
  buildOpenAIRealtimeConferenceTwiml,
  createOpenAIRealtimeConferenceParticipant,
  getVoiceProvider,
} from "@/lib/voice/openai-realtime";
import { defaultVoiceId, isAllowedVoiceId } from "@/lib/voice/voice-options";

function twiml(xml: string) {
  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function extractConversationId(xml: string) {
  return xml.match(/name="conversation_id" value="([^"]+)"/)?.[1] ?? null;
}

function buildHybridVoiceTwiml(input: { callSid: string; baseUrl: string }) {
  const actionUrl = `${input.baseUrl}/api/twilio/voice/hybrid?callSid=${encodeURIComponent(input.callSid)}`;

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<Response>",
    `<Redirect method="POST">${actionUrl}</Redirect>`,
    "</Response>",
  ].join("");
}

async function registerElevenLabsTwilioCall(input: {
  fromNumber: string;
  toNumber: string;
  memberName: string;
  caregiverName: string;
  companionContext: string;
  currentContext: string;
  recentTopics: string[];
  topicsToRevisit: string[];
  avoidRepeating: string[];
  preferredVoiceId?: string | null;
}) {
  const env = getServerEnv();

  if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_AGENT_ID) {
    throw new Error("ElevenLabs Twilio bridge is not configured.");
  }

  const response = await fetch("https://api.elevenlabs.io/v1/convai/twilio/register-call", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      agent_id: env.ELEVENLABS_AGENT_ID,
      from_number: input.fromNumber,
      to_number: input.toNumber,
      direction: "outbound",
      conversation_initiation_client_data: {
        dynamic_variables: {
          member_name: input.memberName,
          caregiver_name: input.caregiverName,
          companion_context: input.companionContext,
          current_context: input.currentContext,
          recent_topics: input.recentTopics.join(", ") || "none yet",
          topics_to_revisit: input.topicsToRevisit.join("; ") || "none yet",
          avoid_repeating: input.avoidRepeating.join("; ") || "Do not use a generic scripted wellness survey opening.",
        },
        conversation_config_override: {
          tts: {
            voice_id: isAllowedVoiceId(input.preferredVoiceId ?? "") ? input.preferredVoiceId : defaultVoiceId,
          },
        },
      },
    }),
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(body || `ElevenLabs register call failed with status ${response.status}`);
  }

  return body;
}

function isMachine(answeredBy: string | null) {
  if (!answeredBy) return false;
  return answeredBy.toLowerCase().startsWith("machine") || answeredBy.toLowerCase() === "fax";
}

function getRequestedVoiceProvider(value: string | null) {
  if (
    value === "openai_realtime_twilio" ||
    value === "openai_text_elevenlabs_twilio" ||
    value === "elevenlabs_twilio"
  ) {
    return value;
  }

  return null;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const formData = await request.formData();
  const callSid = String(formData.get("CallSid") ?? "");
  const answeredBy = String(formData.get("AnsweredBy") ?? "");
  const fromNumber = String(formData.get("From") ?? "");
  const toNumber = String(formData.get("To") ?? "");
  const callToken = String(formData.get("CallToken") ?? "");
  const memberName = url.searchParams.get("memberName") ?? "there";
  const caregiverName = url.searchParams.get("caregiverName") ?? "your caregiver";

  if (callSid && isMachine(answeredBy)) {
    const summary = "Voicemail or answering machine detected. DailyCall hung up without leaving a voicemail message.";
    const callAttempt = await prisma.callAttempt.findFirst({
      where: { providerCallSid: callSid },
      include: { member: { include: { customer: true } } },
    });
    const isDemoCall = callAttempt?.member.customer.email === "demo-family@dailycall.local" || callAttempt?.member.preferredCallTime === "Landing page demo";
    let alertSentAt = callAttempt?.alertSentAt ?? null;

    if (callAttempt && !alertSentAt) {
      try {
        await sendExampleVoicemailAlertSmsToTeam({
          memberName: callAttempt.member.name,
          summary,
          isDemo: isDemoCall,
        });
        alertSentAt = new Date();
      } catch (error) {
        console.error("Failed to send voicemail alert SMS", error);
      }
    }

    const retryAttempt = callAttempt?.retryAttempt ?? 0;
    const retryLimit = isDemoCall ? 0 : callAttempt?.member.voicemailRetryCount ?? 0;
    const retryDelayMins = callAttempt?.member.voicemailRetryDelayMins ?? 15;
    let retryScheduledFor: Date | null = null;

    if (callAttempt && retryAttempt < retryLimit) {
      const existingRetry = await prisma.callAttempt.findFirst({
        where: {
          retryOfCallAttemptId: callAttempt.id,
          status: "SCHEDULED",
        },
      });

      if (!existingRetry) {
        retryScheduledFor = new Date(Date.now() + retryDelayMins * 60 * 1000);
        await prisma.callAttempt.create({
          data: {
            memberId: callAttempt.memberId,
            scheduledFor: retryScheduledFor,
            status: "SCHEDULED",
            retryAttempt: retryAttempt + 1,
            retryOfCallAttemptId: callAttempt.id,
            summary: `Retry ${retryAttempt + 1} of ${retryLimit} scheduled after voicemail detection.`,
          },
        });
      } else {
        retryScheduledFor = existingRetry.scheduledFor;
      }
    }

    await prisma.callAttempt.updateMany({
      where: { providerCallSid: callSid },
      data: {
        status: "NO_RESPONSE",
        completedAt: new Date(),
        summary: retryScheduledFor ? `${summary} Retry scheduled for ${retryScheduledFor.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: callAttempt?.member.timezone ?? "America/Los_Angeles" })}.` : summary,
        conversationRaw: Object.fromEntries(formData.entries()) as Prisma.InputJsonValue,
        syncedAt: new Date(),
        alertSentAt,
      },
    });

    return twiml("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Hangup /></Response>");
  }

  if (callSid) {
    await prisma.callAttempt.updateMany({
      where: { providerCallSid: callSid },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
        summary: "Human answer detected. DailyCall is connecting the call to the voice agent.",
        conversationRaw: Object.fromEntries(formData.entries()) as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
    });
  }

  try {
    const callAttempt = callSid
      ? await prisma.callAttempt.findFirst({
          where: { providerCallSid: callSid },
          include: { member: { include: { memory: true } } },
        })
      : null;
    const recentCalls = callAttempt
      ? await prisma.callAttempt.findMany({
          where: {
            memberId: callAttempt.memberId,
            id: { not: callAttempt.id },
            summary: { not: null },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [];
    const cachedCurrentContext = await getCachedCallCurrentContext(prisma);
    const companionContext = callAttempt
      ? buildCompanionContext({
          memberName: callAttempt.member.name,
          memory: callAttempt.member.memory,
          recentCalls,
          currentContext: cachedCurrentContext,
        })
      : {
          companionContext: [
            "You are calling " + memberName + ". Sound like a familiar, warm daily companion, not a clinical checklist.",
            cachedCurrentContext || buildCurrentConversationContext(),
            "Open with warmth and variety. Ask one easy, human question.",
          ].join("\n"),
          currentContext: cachedCurrentContext || buildCurrentConversationContext(),
          recentTopics: [],
          topicsToRevisit: [],
          avoidRepeating: ["Do not use a generic scripted wellness survey opening."],
    };
    const voiceProvider = getRequestedVoiceProvider(url.searchParams.get("voiceProvider")) ?? getVoiceProvider();

    if (voiceProvider === "openai_text_elevenlabs_twilio") {
      const env = getServerEnv();
      const baseUrl = (env.PUBLIC_APP_URL ?? env.APP_URL)?.replace(/\/$/, "");

      if (!baseUrl) {
        throw new Error("PUBLIC_APP_URL or APP_URL is required for the hybrid Twilio voice loop.");
      }

      if (callSid) {
        await prisma.callAttempt.updateMany({
          where: { providerCallSid: callSid },
          data: {
            summary: "Human answer detected. DailyCall is connecting OpenAI text replies to ElevenLabs voice playback.",
            conversationRaw: {
              provider: "openai_text_elevenlabs_twilio",
              twilioAmd: Object.fromEntries(formData.entries()),
              hybridTranscript: [],
            } as Prisma.InputJsonValue,
            syncedAt: new Date(),
          },
        });
      }

      return twiml(buildHybridVoiceTwiml({ callSid, baseUrl }));
    }

    if (voiceProvider === "openai_realtime_twilio") {
      const conferenceName = `dailycall-${callSid}`;

      const openAIParticipant = await createOpenAIRealtimeConferenceParticipant({
        conferenceName,
        fromNumber,
        callAttemptId: callAttempt?.id,
        callToken,
      });

      const openAITwiml = buildOpenAIRealtimeConferenceTwiml({ conferenceName });

      if (callSid) {
        await prisma.callAttempt.updateMany({
          where: { providerCallSid: callSid },
          data: {
            summary: "Human answer detected. DailyCall is connecting the call to an OpenAI Realtime conference.",
            conversationRaw: {
              provider: "openai_realtime",
              twilioAmd: Object.fromEntries(formData.entries()),
              openAISipParticipant: openAIParticipant,
            } as Prisma.InputJsonValue,
            syncedAt: new Date(),
          },
        });
      }

      return twiml(openAITwiml);
    }

    const elevenLabsTwiml = await registerElevenLabsTwilioCall({
      fromNumber,
      toNumber,
      memberName: callAttempt?.member.name ?? memberName,
      caregiverName,
      preferredVoiceId: callAttempt?.member.preferredVoiceId,
      ...companionContext,
    });
    const conversationId = extractConversationId(elevenLabsTwiml);

    if (callSid && conversationId) {
      await prisma.callAttempt.updateMany({
        where: { providerCallSid: callSid },
        data: {
          providerConversationId: conversationId,
          syncedAt: new Date(),
        },
      });
    }

    return twiml(elevenLabsTwiml);
  } catch (error) {
    if (callSid) {
      await prisma.callAttempt.updateMany({
        where: { providerCallSid: callSid },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          summary: error instanceof Error ? error.message : "Human answer detected, but DailyCall could not connect the call to the voice agent.",
          syncedAt: new Date(),
        },
      });
    }

    return twiml(
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Say>DailyCall is not fully configured yet. Goodbye.</Say><Hangup /></Response>",
    );
  }
}
