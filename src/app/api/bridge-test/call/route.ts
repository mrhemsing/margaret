import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { startAmdProtectedCheckInCall } from "@/lib/voice/twilio";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  toNumber: z.string().min(8),
  memberName: z.string().min(1).optional(),
  caregiverName: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Invalid request. Expected toNumber, optional memberName, optional caregiverName." },
      { status: 400 },
    );
  }

  try {
    const normalizedPhone = parsed.data.toNumber.replace(/\s+/g, "");
    const customer = await prisma.customer.upsert({
      where: { email: "bridge-test@dailycall.local" },
      update: { fullName: "Bridge Test", phoneNumber: "+16043138398" },
      create: {
        email: "bridge-test@dailycall.local",
        fullName: "Bridge Test",
        phoneNumber: "+16043138398",
      },
    });
    const existingMember = await prisma.member.findFirst({
      where: { customerId: customer.id, phoneNumber: normalizedPhone },
    });
    const member = existingMember
      ? await prisma.member.update({
          where: { id: existingMember.id },
          data: { name: parsed.data.memberName ?? existingMember.name },
        })
      : await prisma.member.create({
          data: {
            customerId: customer.id,
            name: parsed.data.memberName ?? "Bridge phone test",
            phoneNumber: normalizedPhone,
            timezone: "America/Los_Angeles",
            preferredCallTime: "Bridge phone test",
          },
        });

    const result = await startAmdProtectedCheckInCall({
      toNumber: normalizedPhone,
      memberName: member.name,
      caregiverName: parsed.data.caregiverName ?? "DailyCall bridge test reviewer",
      voiceProvider: "openai_text_elevenlabs_twilio",
      machineDetection: false,
      refreshCurrentContext: false,
    });

    const callAttempt = await prisma.callAttempt.create({
      data: {
        memberId: member.id,
        scheduledFor: new Date(),
        startedAt: new Date(),
        status: "IN_PROGRESS",
        providerCallSid: result.sid ?? null,
        summary: `Streaming bridge phone test started for ${member.name}.`,
      },
    });

    return NextResponse.json({
      ok: true,
      provider: "openai_text_elevenlabs_twilio",
      member,
      callAttempt,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown bridge test call error.",
      },
      { status: 502 },
    );
  }
}
