import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
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
    const customer = await prisma.customer.upsert({
      where: { email: "example-family@dailycall.local" },
      update: { fullName: "Example Family", phoneNumber: "+16043138398" },
      create: {
        email: "example-family@dailycall.local",
        fullName: "Example Family",
        phoneNumber: "+16043138398",
      },
    });
    const normalizedPhone = parsed.data.toNumber.replaceAll(" ", "");
    const existingMember = await prisma.member.findFirst({ where: { phoneNumber: normalizedPhone } });
    const member = existingMember
      ? await prisma.member.update({
          where: { id: existingMember.id },
          data: { customerId: customer.id, name: parsed.data.memberName ?? existingMember.name },
        })
      : await prisma.member.create({
          data: {
            customerId: customer.id,
            name: parsed.data.memberName ?? "Test member",
            phoneNumber: normalizedPhone,
            timezone: "America/Los_Angeles",
            preferredCallTime: "On demand test",
          },
        });

    const result = await startOutboundCheckInCall(parsed.data);

    if (!result) {
      throw new Error("ElevenLabs did not return a call result.");
    }

    const callAttempt = await prisma.callAttempt.create({
      data: {
        memberId: member.id,
        scheduledFor: new Date(),
        startedAt: new Date(),
        status: "IN_PROGRESS",
        providerConversationId: result.conversation_id ?? null,
        providerCallSid: result.callSid ?? null,
        summary: `Test call started for ${member.name}. Transcript will appear after ElevenLabs finishes processing the conversation.`,
      },
    });

    return NextResponse.json({
      ok: true,
      provider: "elevenlabs_twilio",
      member,
      callAttempt,
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
