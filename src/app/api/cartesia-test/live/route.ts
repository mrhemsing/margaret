import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { getCartesiaConfigFromRaw, getPublicBaseUrl } from "@/lib/cartesia-test-call";
import { prisma } from "@/lib/db";
import { buildCurrentConversationContext } from "@/lib/voice/companion-context";
import { formatHybridTranscript, generateHybridOpenAIReply, getHybridTranscript, type HybridTranscriptTurn } from "@/lib/voice/hybrid";

export const dynamic = "force-dynamic";

function twiml(xml: string, status = 200) {
  return new NextResponse(xml, {
    status,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
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

function getInitialPrompt(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const prompt = (raw as Record<string, unknown>).initialPrompt;
  return typeof prompt === "string" && prompt.trim() ? prompt.trim() : null;
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
  const callAttemptId = url.searchParams.get("callAttemptId") ?? "";
  const idleCount = Number(url.searchParams.get("idle") ?? "0");
  const speechResult = String(formData.get("SpeechResult") ?? "").trim();
  const callSid = String(formData.get("CallSid") ?? "");

  if (!callAttemptId) {
    return twiml("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Hangup /></Response>", 400);
  }

  const callAttempt = await prisma.callAttempt.findUnique({
    where: { id: callAttemptId },
    include: { member: { include: { customer: true } } },
  });

  if (!callAttempt) {
    return twiml("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Say>DailyCall could not find this call. Goodbye.</Say><Hangup /></Response>", 404);
  }

  const cartesiaConfig = getCartesiaConfigFromRaw(callAttempt.conversationRaw);
  if (!cartesiaConfig) {
    return twiml("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Say>Cartesia live test is missing its voice configuration. Goodbye.</Say><Hangup /></Response>", 400);
  }

  const turns: HybridTranscriptTurn[] = getHybridTranscript(callAttempt.conversationRaw);
  if (callSid && callSid !== callAttempt.providerCallSid) {
    await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: { providerCallSid: callSid, syncedAt: new Date() },
    });
  }

  if (speechResult) {
    turns.push({ speaker: callAttempt.member.name, text: speechResult });
  } else if (turns.length === 0) {
    turns.push({
      speaker: "DailyCall",
      text:
        getInitialPrompt(callAttempt.conversationRaw) ??
        `Hi ${callAttempt.member.name}, this is DailyCall. I am testing a Cartesia voice today, and I would love to hear how this sounds to you.`,
    });
  } else if (idleCount >= 2) {
    turns.push({ speaker: callAttempt.member.name, text: "[No response]" });
  }

  let openAIDurationMs = 0;
  if (speechResult || (idleCount >= 2 && turns.length > 1)) {
    const openAIStartedAt = Date.now();
    const assistantText =
      idleCount >= 2 && !speechResult && turns.length > 2
        ? "I will let you go for now. Thanks for testing the Cartesia voice with me."
        : await generateHybridOpenAIReply({
            memberName: callAttempt.member.name,
            caregiverName: callAttempt.member.customer.fullName || "DailyCall test reviewer",
            companionContext: [
              `You are running a DailyCall Cartesia voice test with ${callAttempt.member.name}.`,
              "Keep the conversation natural and brief. The goal is to let the caller talk with the selected Cartesia voice.",
            ].join("\n"),
            currentContext: buildCurrentConversationContext(),
            recentTopics: [],
            topicsToRevisit: [],
            avoidRepeating: ["Do not sound like a canned sample playback."],
            transcript: turns,
          });
    openAIDurationMs = Date.now() - openAIStartedAt;
    turns.push({ speaker: "DailyCall", text: assistantText });
  }

  const turnIndex = turns.length - 1;
  const baseUrl = getPublicBaseUrl();
  const actionUrl = `${baseUrl}/api/cartesia-test/live?callAttemptId=${encodeURIComponent(callAttempt.id)}`;
  const audioUrl = `${baseUrl}/api/cartesia-test/live-audio?callAttemptId=${encodeURIComponent(callAttempt.id)}&turn=${turnIndex}`;
  const shouldHangup = idleCount >= 2 && !speechResult && turns.length > 2;

  await prisma.callAttempt.update({
    where: { id: callAttempt.id },
    data: {
      status: shouldHangup ? "ANSWERED_OK" : "IN_PROGRESS",
      completedAt: shouldHangup ? new Date() : undefined,
      transcript: formatHybridTranscript(turns),
      summary: `Cartesia live test captured ${turns.length} transcript turn${turns.length === 1 ? "" : "s"}.`,
      conversationRaw: {
        provider: "openai_text_cartesia_twilio",
        cartesiaConfig,
        initialPrompt: getInitialPrompt(callAttempt.conversationRaw),
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

  return twiml(
    buildGatherTwiml({
      actionUrl,
      audioUrl,
      nextIdleCount: idleCount + 1,
      shouldHangup,
    }),
  );
}
