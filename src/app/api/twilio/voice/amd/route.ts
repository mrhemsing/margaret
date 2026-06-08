import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { formatRetryScheduledSummary, scheduleNoResponseRetry } from "@/lib/calls/retries";
import { prisma } from "@/lib/db";
import { sendVoicemailAlertSmsToAlertContacts } from "@/lib/sms/twilio";
import { getServerEnv } from "@/lib/env";
import { buildCompanionContext, buildCurrentConversationContext } from "@/lib/voice/companion-context";
import { getCachedCallCurrentContext } from "@/lib/voice/current-info";
import { defaultVoiceId, isAllowedVoiceId } from "@/lib/voice/voice-options";

function twiml(xml: string) {
  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function extractConversationId(xml: string) {
  return xml.match(/name="conversation_id" value="([^"]+)"/)?.[1] ?? null;
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
  firstMessage?: string | null;
  demoMaxDurationSeconds?: number | null;
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
          demo_max_duration_seconds: input.demoMaxDurationSeconds ?? null,
        },
        conversation_config_override: {
          ...(input.firstMessage
            ? {
                agent: {
                  first_message: input.firstMessage,
                },
              }
            : {}),
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
  if (value === "elevenlabs_twilio") {
    return value;
  }

  return null;
}

function getCallRawObject(value: Prisma.JsonValue | null) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getRawString(raw: Record<string, unknown>, key: string) {
  return typeof raw[key] === "string" ? raw[key] : null;
}

function getRawNumber(raw: Record<string, unknown>, key: string) {
  const value = raw[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const formData = await request.formData();
  const callSid = String(formData.get("CallSid") ?? "");
  const answeredBy = String(formData.get("AnsweredBy") ?? "");
  const fromNumber = String(formData.get("From") ?? "");
  const toNumber = String(formData.get("To") ?? "");
  const callAttemptId = url.searchParams.get("callAttemptId");
  const memberName = url.searchParams.get("memberName") ?? "there";
  const caregiverName = url.searchParams.get("caregiverName") ?? "your caregiver";
  const callAttemptWhere = callAttemptId
    ? { id: callAttemptId }
    : callSid
      ? { providerCallSid: callSid }
      : null;

  if (callSid && isMachine(answeredBy)) {
    const summary = "Voicemail or answering machine detected. DailyCall hung up without leaving a voicemail message.";
    const callAttempt = callAttemptWhere ? await prisma.callAttempt.findFirst({
      where: callAttemptWhere,
      include: { member: { include: { customer: { include: { alertContacts: true } } } } },
    }) : null;
    const isDemoCall = callAttempt?.member.customer.email === "demo-family@dailycall.local" || callAttempt?.member.preferredCallTime === "Landing page demo";
    let alertSentAt = callAttempt?.alertSentAt ?? null;

    if (callAttempt && !alertSentAt) {
      try {
        await sendVoicemailAlertSmsToAlertContacts({
          alertContacts: callAttempt.member.customer.alertContacts,
          memberName: callAttempt.member.name,
          summary,
          isDemo: isDemoCall,
        });
        alertSentAt = new Date();
      } catch (error) {
        console.error("Failed to send voicemail alert SMS", error);
      }
    }

    const retry = callAttempt ? await scheduleNoResponseRetry(prisma, { callAttemptId: callAttempt.id }) : null;

    await prisma.callAttempt.updateMany({
      where: callAttemptWhere ?? { providerCallSid: callSid },
      data: {
        status: "NO_RESPONSE",
        providerCallSid: callSid,
        completedAt: new Date(),
        summary: formatRetryScheduledSummary({
          summary,
          retryScheduledFor: retry?.retryScheduledFor ?? null,
          timeZone: callAttempt?.member.timezone,
        }),
        conversationRaw: Object.fromEntries(formData.entries()) as Prisma.InputJsonValue,
        syncedAt: new Date(),
        alertSentAt,
      },
    });

    return twiml("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Hangup /></Response>");
  }

  if (callSid) {
    await prisma.callAttempt.updateMany({
      where: callAttemptWhere ?? { providerCallSid: callSid },
      data: {
        status: "IN_PROGRESS",
        providerCallSid: callSid,
        startedAt: new Date(),
        summary: "They picked up. DailyCall is chatting with them now.",
        conversationRaw: Object.fromEntries(formData.entries()) as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
    });
  }

  try {
    const callAttempt = callAttemptWhere
      ? await prisma.callAttempt.findFirst({
          where: callAttemptWhere,
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
    const callRaw = getCallRawObject(callAttempt?.conversationRaw ?? null);
    const companionContext = callAttempt
      ? buildCompanionContext({
          memberName: callAttempt.member.name,
          memory: callAttempt.member.memory,
          recentCalls,
          currentContext: getRawString(callRaw, "demoCurrentContext") ?? cachedCurrentContext,
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
    const requestedVoiceProvider = url.searchParams.get("voiceProvider");
    if (requestedVoiceProvider && getRequestedVoiceProvider(requestedVoiceProvider) !== "elevenlabs_twilio") {
      console.warn(`Ignoring non-ElevenLabs product voice provider request: ${requestedVoiceProvider}`);
    }

    const elevenLabsTwiml = await registerElevenLabsTwilioCall({
      fromNumber,
      toNumber,
      memberName: callAttempt?.member.name ?? memberName,
      caregiverName,
      preferredVoiceId: callAttempt?.member.preferredVoiceId,
      firstMessage: getRawString(callRaw, "firstMessage"),
      demoMaxDurationSeconds: getRawNumber(callRaw, "demoMaxDurationSeconds"),
      ...companionContext,
    });
    const conversationId = extractConversationId(elevenLabsTwiml);

    if (callSid && conversationId) {
      await prisma.callAttempt.updateMany({
        where: callAttemptWhere ?? { providerCallSid: callSid },
        data: {
          providerCallSid: callSid,
          providerConversationId: conversationId,
          syncedAt: new Date(),
        },
      });
    }

    return twiml(elevenLabsTwiml);
  } catch (error) {
    if (callSid) {
      await prisma.callAttempt.updateMany({
        where: callAttemptWhere ?? { providerCallSid: callSid },
        data: {
          status: "FAILED",
          providerCallSid: callSid,
          completedAt: new Date(),
          summary: error instanceof Error ? error.message : "The call was answered, but DailyCall could not start the conversation.",
          syncedAt: new Date(),
        },
      });
    }

    return twiml(
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Say>DailyCall is not fully configured yet. Goodbye.</Say><Hangup /></Response>",
    );
  }
}
