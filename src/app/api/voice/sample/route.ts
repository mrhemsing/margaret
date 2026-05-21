import { NextResponse } from "next/server";
import { getServerEnv } from "@/lib/env";
import { getVoiceOption, isAllowedVoiceId } from "@/lib/voice/voice-options";

export const dynamic = "force-dynamic";

const sampleText = "Hi, this is DailyCall. I am calling for your daily check-in. How are you feeling today?";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const voiceId = url.searchParams.get("voiceId") ?? "";

  if (!isAllowedVoiceId(voiceId)) {
    return NextResponse.json({ ok: false, error: "Voice not available." }, { status: 404 });
  }

  const env = getServerEnv();

  if (!env.ELEVENLABS_API_KEY) {
    return NextResponse.json({ ok: false, error: "ElevenLabs voice samples are not configured." }, { status: 503 });
  }

  const voice = getVoiceOption(voiceId);
  const response = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + voice.id + "?output_format=mp3_44100_64&optimize_streaming_latency=3", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "xi-api-key": env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: sampleText,
      model_id: "eleven_flash_v2_5",
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.8,
        speed: 1,
      },
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ ok: false, error: "Voice sample is unavailable right now." }, { status: 502 });
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
