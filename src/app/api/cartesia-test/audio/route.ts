import { NextResponse } from "next/server";

import { verifyCartesiaTestCallToken } from "@/lib/cartesia-test-call";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  let payload;

  try {
    payload = verifyCartesiaTestCallToken(url.searchParams.get("token"));
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid Cartesia test call token." },
      { status: 401 },
    );
  }

  const env = getServerEnv();

  if (!env.CARTESIA_API_KEY) {
    return NextResponse.json({ ok: false, error: "CARTESIA_API_KEY is not configured." }, { status: 503 });
  }

  const response = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CARTESIA_API_KEY}`,
      "Cartesia-Version": "2025-04-16",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transcript: payload.transcript,
      model_id: payload.modelId,
      voice: {
        mode: "id",
        id: payload.voiceId,
      },
      output_format: {
        container: "wav",
        encoding: "pcm_mulaw",
        sample_rate: 8000,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return NextResponse.json(
      { ok: false, error: body || `Cartesia audio failed with status ${response.status}.` },
      { status: 502 },
    );
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
    },
  });
}
