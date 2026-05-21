import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  transcript: z.string().trim().min(1).max(1000),
  modelId: z.enum(["sonic-2", "sonic-3"]).default("sonic-2"),
  voiceId: z.string().uuid(),
});

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid Cartesia test request." }, { status: 400 });
  }

  const env = getServerEnv();

  if (!env.CARTESIA_API_KEY) {
    return NextResponse.json({ ok: false, error: "CARTESIA_API_KEY is not configured." }, { status: 503 });
  }

  const startedAt = Date.now();
  const response = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CARTESIA_API_KEY}`,
      "Cartesia-Version": "2025-04-16",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transcript: parsed.data.transcript,
      model_id: parsed.data.modelId,
      voice: {
        mode: "id",
        id: parsed.data.voiceId,
      },
      output_format: {
        container: "wav",
        encoding: "pcm_f32le",
        sample_rate: 44100,
      },
    }),
  });
  const upstreamMs = Date.now() - startedAt;

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return NextResponse.json(
      {
        ok: false,
        error: body || `Cartesia request failed with status ${response.status}.`,
      },
      { status: 502 },
    );
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": "audio/wav",
      "Cache-Control": "no-store",
      "x-cartesia-upstream-ms": upstreamMs.toString(),
    },
  });
}
