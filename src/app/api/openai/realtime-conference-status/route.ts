import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getDailyCallOutboundFromNumber } from "@/lib/env";
import { createOpenAIRealtimeConferenceParticipant } from "@/lib/voice/openai-realtime";

export const dynamic = "force-dynamic";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getObject(raw: Prisma.JsonValue | null | undefined) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function isOpenAIRealtimeTestAttempt(raw: Prisma.JsonValue | null | undefined) {
  return getObject(raw).provider === "openai_realtime";
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const formData = await request.formData();
  const callAttemptId = url.searchParams.get("callAttemptId");
  const conferenceName = url.searchParams.get("conferenceName");
  const callSid = getString(formData, "CallSid");
  const callStatus = getString(formData, "CallStatus");
  const raw = Object.fromEntries(formData.entries()) as Prisma.InputJsonObject;

  if (!callAttemptId || !conferenceName) {
    return NextResponse.json({ ok: false, error: "Missing callAttemptId or conferenceName." }, { status: 400 });
  }

  const callAttempt = await prisma.callAttempt.findUnique({
    where: { id: callAttemptId },
  });

  if (!callAttempt) {
    return NextResponse.json({ ok: false, error: "Call attempt not found." }, { status: 404 });
  }

  if (!isOpenAIRealtimeTestAttempt(callAttempt.conversationRaw)) {
    return NextResponse.json(
      {
        ok: false,
        error: "OpenAI Realtime conference callbacks are restricted to explicit admin test call attempts.",
      },
      { status: 403 },
    );
  }

  const existingRaw = getObject(callAttempt.conversationRaw);
  const shouldConnectOpenAI =
    (callStatus === "answered" || callStatus === "in-progress") && !existingRaw.openAISipParticipantSid;

  if (shouldConnectOpenAI) {
    const participant = await createOpenAIRealtimeConferenceParticipant({
      conferenceName,
      fromNumber: getDailyCallOutboundFromNumber(),
      callAttemptId,
    });

    await prisma.callAttempt.update({
      where: { id: callAttemptId },
      data: {
        providerCallSid: callSid || callAttempt.providerCallSid,
        summary: "They picked up. DailyCall is chatting with them now.",
        conversationRaw: {
          ...existingRaw,
          provider: "openai_realtime",
          openAISipMode: "conference_on_answer",
          conferenceName,
          openAISipParticipantSid: participant?.sid ?? null,
          twilioConferenceStatus: raw,
        } as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
    });
  } else if (callStatus === "completed") {
    await prisma.callAttempt.update({
      where: { id: callAttemptId },
      data: {
        completedAt: new Date(),
        conversationRaw: {
          ...existingRaw,
          provider: "openai_realtime",
          openAISipMode: "conference_on_answer",
          conferenceName,
          twilioConferenceStatus: raw,
        } as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
    });
  } else {
    await prisma.callAttempt.update({
      where: { id: callAttemptId },
      data: {
        providerCallSid: callSid || callAttempt.providerCallSid,
        conversationRaw: {
          ...existingRaw,
          provider: "openai_realtime",
          openAISipMode: "conference_on_answer",
          conferenceName,
          twilioConferenceStatus: raw,
        } as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
