import { NextResponse } from "next/server";

import { getCartesiaConfigFromRaw, synthesizeCartesiaPhoneSpeech } from "@/lib/cartesia-test-call";
import { prisma } from "@/lib/db";
import { getHybridTranscript } from "@/lib/voice/hybrid";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const callAttemptId = url.searchParams.get("callAttemptId") ?? "";
  const turnIndex = Number(url.searchParams.get("turn") ?? "-1");

  if (!callAttemptId || !Number.isInteger(turnIndex) || turnIndex < 0) {
    return NextResponse.json({ ok: false, error: "Missing callAttemptId or turn." }, { status: 400 });
  }

  const callAttempt = await prisma.callAttempt.findUnique({
    where: { id: callAttemptId },
    select: { conversationRaw: true },
  });
  const cartesiaConfig = getCartesiaConfigFromRaw(callAttempt?.conversationRaw);
  const turn = getHybridTranscript(callAttempt?.conversationRaw)[turnIndex];

  if (!cartesiaConfig) {
    return NextResponse.json({ ok: false, error: "Cartesia voice configuration not found." }, { status: 404 });
  }

  if (!turn || turn.speaker !== "DailyCall") {
    return NextResponse.json({ ok: false, error: "Speech turn not found." }, { status: 404 });
  }

  const response = await synthesizeCartesiaPhoneSpeech({
    ...cartesiaConfig,
    transcript: turn.text,
  });

  console.log("Cartesia live audio ready", {
    callAttemptId,
    turnIndex,
    cartesiaMs: Date.now() - startedAt,
  });

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "private, max-age=300",
    },
  });
}
