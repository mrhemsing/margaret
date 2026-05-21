import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getHybridTranscript, synthesizeElevenLabsSpeech } from "@/lib/voice/hybrid";
import { defaultVoiceId, isAllowedVoiceId } from "@/lib/voice/voice-options";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const startedAt = Date.now();
  const url = new URL(request.url);
  const callAttemptId = url.searchParams.get("callAttemptId") ?? "";
  const turnIndex = Number(url.searchParams.get("turn") ?? "-1");
  const requestedVoiceId = url.searchParams.get("voiceId") ?? "";
  const voiceId = isAllowedVoiceId(requestedVoiceId) ? requestedVoiceId : defaultVoiceId;

  if (!callAttemptId || !Number.isInteger(turnIndex) || turnIndex < 0) {
    return NextResponse.json({ ok: false, error: "Missing callAttemptId or turn." }, { status: 400 });
  }

  const callAttempt = await prisma.callAttempt.findUnique({
    where: { id: callAttemptId },
    select: { conversationRaw: true },
  });
  const turn = getHybridTranscript(callAttempt?.conversationRaw)[turnIndex];

  if (!turn || turn.speaker !== "DailyCall") {
    return NextResponse.json({ ok: false, error: "Speech turn not found." }, { status: 404 });
  }

  const response = await synthesizeElevenLabsSpeech({ text: turn.text, voiceId });

  console.log("Hybrid voice audio ready", {
    callAttemptId,
    turnIndex,
    elevenLabsMs: Date.now() - startedAt,
  });

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=300",
    },
  });
}
