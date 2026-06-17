import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { buildCompanionContext, buildCurrentConversationContext } from "@/lib/voice/companion-context";
import { summarizeConversationForFamily } from "@/lib/voice/conversation-insights";
import { getCallBriefing } from "@/lib/voice/current-info";
import {
  formatHybridTranscript,
  generateHybridOpenAIReply,
  getHybridTranscript,
  type HybridTranscriptTurn,
} from "@/lib/voice/hybrid";
import { defaultVoiceId, isAllowedVoiceId } from "@/lib/voice/voice-options";

export const dynamic = "force-dynamic";

function twiml(xml: string) {
  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function getPublicBaseUrl(request: Request) {
  const envUrl = process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function getRawObject(raw: Prisma.JsonValue | null | undefined) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function buildGatherTwiml(input: {
  actionUrl: string;
  audioUrl: string;
  nextIdleCount: number;
  shouldHangup?: boolean;
}) {
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<Response>",
    `<Play>${xmlEscape(input.audioUrl)}</Play>`,
    input.shouldHangup
      ? "<Hangup />"
      : [
          `<Gather input="speech" action="${xmlEscape(input.actionUrl)}" method="POST" language="en-US" speechTimeout="1" timeout="4" profanityFilter="false" />`,
          `<Redirect method="POST">${xmlEscape(`${input.actionUrl}&idle=${input.nextIdleCount}`)}</Redirect>`,
        ].join(""),
    "</Response>",
  ].join("");
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const formData = await request.formData().catch(() => new FormData());
  const callSid = url.searchParams.get("callSid") ?? String(formData.get("CallSid") ?? "");
  const idleCount = Number(url.searchParams.get("idle") ?? "0");
  const speechResult = String(formData.get("SpeechResult") ?? "").trim();

  if (!callSid) {
    return twiml("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Hangup /></Response>");
  }

  const callAttempt = await prisma.callAttempt.findFirst({
    where: { providerCallSid: callSid },
    include: { member: { include: { memory: true, customer: true } } },
  });

  if (!callAttempt) {
    return twiml("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Say>DailyCall could not find this call. Goodbye.</Say><Hangup /></Response>");
  }

  if (getRawObject(callAttempt.conversationRaw).provider !== "openai_text_elevenlabs_twilio") {
    return twiml("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Hangup /></Response>");
  }

  const turns: HybridTranscriptTurn[] = getHybridTranscript(callAttempt.conversationRaw);
  if (speechResult) {
    turns.push({ speaker: callAttempt.member.name, text: speechResult });
  } else if (idleCount >= 2 && turns.length > 0) {
    turns.push({ speaker: callAttempt.member.name, text: "[No response]" });
  }

  const recentCalls = await prisma.callAttempt.findMany({
    where: {
      memberId: callAttempt.memberId,
      id: { not: callAttempt.id },
      summary: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  const cachedCurrentContext = await getCallBriefing(prisma, { memberId: callAttempt.memberId, memory: callAttempt.member.memory });
  const companionContext = buildCompanionContext({
    memberName: callAttempt.member.name,
    memory: callAttempt.member.memory,
    recentCalls,
    currentContext: cachedCurrentContext,
  });

  const openAIStartedAt = Date.now();
  const assistantText = idleCount >= 2 && !speechResult && turns.length > 1
    ? "I will let you go for now. It was good talking with you, and I hope the rest of your day feels easy."
    : await generateHybridOpenAIReply({
        memberName: callAttempt.member.name,
        caregiverName: callAttempt.member.customer.fullName || "your family",
        ...companionContext,
        currentContext: companionContext.currentContext || cachedCurrentContext || buildCurrentConversationContext(),
        transcript: turns,
      });
  const openAIDurationMs = Date.now() - openAIStartedAt;

  turns.push({ speaker: "DailyCall", text: assistantText });

  const voiceId = isAllowedVoiceId(callAttempt.member.preferredVoiceId) ? callAttempt.member.preferredVoiceId : defaultVoiceId;
  const turnIndex = turns.length - 1;
  const baseUrl = getPublicBaseUrl(request);
  const actionUrl = `${baseUrl}/api/twilio/voice/hybrid?callSid=${encodeURIComponent(callSid)}`;
  const audioUrl = `${baseUrl}/api/twilio/voice/hybrid-audio?callAttemptId=${encodeURIComponent(callAttempt.id)}&turn=${turnIndex}&voiceId=${encodeURIComponent(voiceId)}`;
  const transcript = formatHybridTranscript(turns);

  await prisma.callAttempt.update({
    where: { id: callAttempt.id },
    data: {
      status: idleCount >= 2 && !speechResult && turns.length > 2 ? "ANSWERED_OK" : "IN_PROGRESS",
      completedAt: idleCount >= 2 && !speechResult && turns.length > 2 ? new Date() : undefined,
      transcript,
      summary: summarizeConversationForFamily({ memberName: callAttempt.member.name, transcript }),
      conversationRaw: {
        provider: "openai_text_elevenlabs_twilio",
        twilioCallSid: callSid,
        hybridTranscript: turns,
        lastTurnTiming: {
          routeMs: Date.now() - startedAt,
          openAIMs: openAIDurationMs,
          receivedSpeech: Boolean(speechResult),
          idleCount,
        },
      } as Prisma.InputJsonValue,
      syncedAt: new Date(),
    },
  });

  console.log("Hybrid voice turn ready", {
    callSid,
    receivedSpeech: Boolean(speechResult),
    idleCount,
    routeMs: Date.now() - startedAt,
    openAIMs: openAIDurationMs,
  });

  return twiml(
    buildGatherTwiml({
      actionUrl,
      audioUrl,
      nextIdleCount: idleCount + 1,
      shouldHangup: idleCount >= 2 && !speechResult && turns.length > 2,
    }),
  );
}
