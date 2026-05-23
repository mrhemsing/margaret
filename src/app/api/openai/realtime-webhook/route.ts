import { NextResponse } from "next/server";
import OpenAI from "openai";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";
import { buildCompanionContext, buildCurrentConversationContext } from "@/lib/voice/companion-context";
import { getCachedCallCurrentContext } from "@/lib/voice/current-info";
import {
  acceptOpenAIRealtimeCall,
  extractOpenAISipHeader,
  startOpenAIRealtimeCallMonitor,
} from "@/lib/voice/openai-realtime";
import { getOpenAIRealtimeVoice } from "@/lib/voice/voice-options";

export const dynamic = "force-dynamic";

type OpenAIWebhookEvent = {
  type?: string;
  data?: {
    call_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

function getInitialPrompt(raw: Prisma.JsonValue | null | undefined) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const prompt = (raw as Record<string, unknown>).initialPrompt;
  return typeof prompt === "string" && prompt.trim() ? prompt.trim() : null;
}

async function parseOpenAIWebhook(request: Request, rawBody: string) {
  const env = getServerEnv();

  if (!env.OPENAI_WEBHOOK_SECRET) {
    return JSON.parse(rawBody) as OpenAIWebhookEvent;
  }

  const client = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    webhookSecret: env.OPENAI_WEBHOOK_SECRET,
  });

  return (await client.webhooks.unwrap(rawBody, request.headers) as unknown) as OpenAIWebhookEvent;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  let event: OpenAIWebhookEvent;

  try {
    event = await parseOpenAIWebhook(request, rawBody);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid OpenAI webhook payload." },
      { status: 400 },
    );
  }

  if (event.type !== "realtime.call.incoming") {
    return NextResponse.json({ ok: true, ignored: event.type ?? "unknown" });
  }

  const callId = event.data?.call_id;

  if (!callId) {
    return NextResponse.json({ ok: false, error: "OpenAI realtime.call.incoming event did not include call_id." }, { status: 400 });
  }

  const attemptId = extractOpenAISipHeader(event, "X-DailyCall-AttemptId");
  const twilioCallSid = extractOpenAISipHeader(event, "X-DailyCall-CallSid");
  const callAttempt = attemptId
    ? await prisma.callAttempt.findUnique({
        where: { id: attemptId },
        include: { member: { include: { memory: true } } },
      })
    : twilioCallSid
      ? await prisma.callAttempt.findFirst({
          where: { providerCallSid: twilioCallSid },
          include: { member: { include: { memory: true } } },
        })
      : await prisma.callAttempt.findFirst({
          where: {
            status: "IN_PROGRESS",
            providerConversationId: null,
            summary: { contains: "OpenAI Realtime" },
          },
          orderBy: { startedAt: "desc" },
          include: { member: { include: { memory: true } } },
        });

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
          "Sound like a familiar, warm daily companion, not a clinical checklist.",
          cachedCurrentContext || buildCurrentConversationContext(),
          "Open with warmth and variety. Ask one easy, human question.",
        ].join("\n"),
        currentContext: cachedCurrentContext || buildCurrentConversationContext(),
        recentTopics: [],
        topicsToRevisit: [],
        avoidRepeating: ["Do not use a generic scripted wellness survey opening."],
      };

  await acceptOpenAIRealtimeCall({
    callId,
    memberName: callAttempt?.member.name ?? "there",
    caregiverName: "your caregiver",
    voice: getOpenAIRealtimeVoice(callAttempt?.member.preferredVoiceId),
    ...companionContext,
  });

  if (callAttempt) {
    await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: {
        status: "IN_PROGRESS",
        startedAt: callAttempt.startedAt ?? new Date(),
        providerConversationId: callId,
        summary: "OpenAI Realtime call connected.",
        conversationRaw: {
          provider: "openai_realtime",
          incomingWebhook: event,
        } as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
    });

    startOpenAIRealtimeCallMonitor({
      callId,
      callAttemptId: callAttempt.id,
      memberName: callAttempt.member.name,
      initialPrompt: getInitialPrompt(callAttempt.conversationRaw),
    });
  }

  return NextResponse.json({ ok: true, accepted: callId, callAttemptId: callAttempt?.id ?? null });
}
