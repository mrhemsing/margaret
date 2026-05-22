import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { getCartesiaConfigFromRaw, getPublicBaseUrl } from "@/lib/cartesia-test-call";
import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { formatHybridTranscript, getHybridTranscript, type HybridTranscriptTurn } from "@/lib/voice/hybrid";

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

type OpenAIResponsesPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

function extractResponseText(payload: OpenAIResponsesPayload) {
  if (payload.output_text?.trim()) return payload.output_text.trim();

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .find((text) => text?.trim())
      ?.trim() ?? null
  );
}

async function generateFastCartesiaTestReply(input: {
  memberName: string;
  caregiverName: string;
  transcript: HybridTranscriptTurn[];
}) {
  const env = getServerEnv();

  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const recentTranscript = formatHybridTranscript(input.transcript.slice(-6));
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": "dailycall-cartesia-live-test",
    },
    body: JSON.stringify({
      model: "gpt-4.1-nano",
      instructions: [
        `You are DailyCall in a live Cartesia voice test with ${input.memberName}.`,
        `The reviewer is ${input.caregiverName}.`,
        "Reply like a warm senior companion, but optimize for speed.",
        "Return only the exact words to say next. No labels, markdown, SSML, or stage directions.",
        "Keep it to one short sentence. Ask one natural follow-up when useful.",
      ].join("\n"),
      input: recentTranscript || "Start with a brief warm greeting and invite the caller to test the voice.",
      max_output_tokens: 55,
      store: false,
    }),
  });

  const payload = (await response.json().catch(() => null)) as OpenAIResponsesPayload | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message ?? `OpenAI Cartesia test response failed with status ${response.status}`);
  }

  const text = payload ? extractResponseText(payload) : null;

  if (!text) {
    throw new Error("OpenAI Cartesia test response did not include speech text.");
  }

  return text.replace(/\s+/g, " ").trim();
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
          `<Gather input="speech" action="${xmlEscape(input.actionUrl)}" method="POST" language="en-US" speechModel="phone_call" speechTimeout="1" timeout="2" profanityFilter="false" />`,
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
        : await generateFastCartesiaTestReply({
            memberName: callAttempt.member.name,
            caregiverName: callAttempt.member.customer.fullName || "DailyCall test reviewer",
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
