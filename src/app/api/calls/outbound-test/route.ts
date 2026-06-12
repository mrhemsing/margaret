import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { startAmdProtectedCheckInCall } from "@/lib/voice/twilio";
import { getVoiceProvider } from "@/lib/voice/openai-realtime";

const TEST_CUSTOMER_EMAILS = ["demo-family@dailycall.local", "example-family@dailycall.local"];
const TEST_PREFERRED_CALL_TIMES = ["Landing page demo", "On demand test", "OpenAI realtime phone test"];
const USER_SAFE_CALL_CONNECTION_ERROR = "The call was answered but could not be connected successfully.";

const requestSchema = z.object({
  toNumber: z.string().min(8),
  memberName: z.string().min(1).optional(),
  caregiverName: z.string().min(1).optional(),
});

async function findProductionMemberByPhone(phoneNumber: string) {
  return prisma.member.findFirst({
    where: {
      phoneNumber,
      active: true,
      preferredCallTime: { notIn: TEST_PREFERRED_CALL_TIMES },
      customer: { email: { notIn: TEST_CUSTOMER_EMAILS } },
    },
    include: { customer: { select: { fullName: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

async function hasRecentInProgressCall(memberId: string, phoneNumber: string) {
  const recentInProgressCall = await prisma.callAttempt.findFirst({
    where: {
      status: "IN_PROGRESS",
      AND: [
        {
          OR: [
            { memberId },
            { member: { phoneNumber } },
          ],
        },
        {
          OR: [
            { providerConversationId: { not: null }, createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
            { providerConversationId: null, createdAt: { gte: new Date(Date.now() - 4 * 60 * 1000) } },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return Boolean(recentInProgressCall);
}

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
    const productionMember = await findProductionMemberByPhone(normalizedPhone);

    if (productionMember) {
      if (await hasRecentInProgressCall(productionMember.id, productionMember.phoneNumber)) {
        return NextResponse.json({ ok: false, error: "A call is already in progress for this loved one." }, { status: 409 });
      }

      const callAttempt = await prisma.callAttempt.create({
        data: {
          memberId: productionMember.id,
          scheduledFor: new Date(),
          startedAt: new Date(),
          status: "IN_PROGRESS",
          summary: `Manual dashboard call is being placed for ${productionMember.name}.`,
        },
      });
      callAttemptId = callAttempt.id;

      const result = await startAmdProtectedCheckInCall({
        toNumber: productionMember.phoneNumber,
        callAttemptId: callAttempt.id,
        memberName: productionMember.name,
        caregiverName: productionMember.customer.fullName || "your family",
      });

      const updatedCallAttempt = await prisma.callAttempt.update({
        where: { id: callAttempt.id },
        data: {
          providerCallSid: result.sid ?? null,
          summary: `Manual dashboard call started for ${productionMember.name}.`,
          syncedAt: new Date(),
        },
      });

      return NextResponse.json({
        ok: true,
        provider: getVoiceProvider(),
        mode: "production_member",
        member: productionMember,
        callAttempt: updatedCallAttempt,
        result,
      });
    }

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
    const member = existingExampleMember
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
      mode: "example_test_member",
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
          summary: error instanceof Error ? error.message : USER_SAFE_CALL_CONNECTION_ERROR,
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
