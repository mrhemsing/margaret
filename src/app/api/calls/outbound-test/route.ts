import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { startAmdProtectedCheckInCall } from "@/lib/voice/twilio";
import { getVoiceProvider } from "@/lib/voice/openai-realtime";

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

  let callAttemptId: string | null = null;

  try {
    const normalizedPhone = parsed.data.toNumber.replaceAll(" ", "");
    const realFamilyMember = await prisma.member.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        customer: { email: "mhemsing@hprodev.com" },
      },
      orderBy: { createdAt: "desc" },
    });
    const customer = await prisma.customer.upsert({
      where: { email: "example-family@dailycall.local" },
      update: { fullName: "Example Family", phoneNumber: "+16043138398" },
      create: {
        email: "example-family@dailycall.local",
        fullName: "Example Family",
        phoneNumber: "+16043138398",
      },
    });
    const existingExampleMember = await prisma.member.findFirst({
      where: { customerId: customer.id, phoneNumber: normalizedPhone },
    });
    const member = realFamilyMember
      ? realFamilyMember
      : existingExampleMember
      ? await prisma.member.update({
          where: { id: existingExampleMember.id },
          data: { name: parsed.data.memberName ?? existingExampleMember.name },
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

    const callAttempt = await prisma.callAttempt.create({
      data: {
        memberId: member.id,
        scheduledFor: new Date(),
        startedAt: new Date(),
        status: "IN_PROGRESS",
        summary: `Test call is being placed for ${member.name}.`,
      },
    });
    callAttemptId = callAttempt.id;

    const result = await startAmdProtectedCheckInCall({ ...parsed.data, callAttemptId: callAttempt.id, memberName: member.name });

    if (!result) {
      throw new Error("Voice provider did not return a call result.");
    }

    const updatedCallAttempt = await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: {
        providerCallSid: result.sid ?? null,
        summary: `Test call started for ${member.name}. Transcript will appear after the voice provider finishes processing the conversation.`,
        syncedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      provider: getVoiceProvider(),
      member,
      callAttempt: updatedCallAttempt,
      result,
    });
  } catch (error) {
    if (callAttemptId) {
      await prisma.callAttempt.update({
        where: { id: callAttemptId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          summary: error instanceof Error ? error.message : "Unknown outbound call error",
          syncedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown outbound call error",
      },
      { status: 502 },
    );
  }
}
