import { NextResponse } from "next/server";
import { z } from "zod";
import { startOutboundCheckInCall } from "@/lib/voice/elevenlabs";

const requestSchema = z.object({
  toNumber: z.string().min(8),
  memberName: z.string().min(1).optional(),
  caregiverName: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request. Expected toNumber, optional memberName, optional caregiverName." },
      { status: 400 },
    );
  }

  try {
    const result = await startOutboundCheckInCall(parsed.data);

    return NextResponse.json({
      ok: true,
      provider: "elevenlabs_twilio",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown outbound call error",
      },
      { status: 502 },
    );
  }
}
