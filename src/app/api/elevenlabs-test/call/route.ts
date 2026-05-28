import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { scheduleTwilioCallEnd } from "@/lib/voice/elevenlabs";
import { startAmdProtectedCheckInCall } from "@/lib/voice/twilio";
import { defaultVoiceId, isAllowedVoiceId } from "@/lib/voice/voice-options";

export const dynamic = "force-dynamic";

const TEST_CALL_MAX_DURATION_SECONDS = 90;

const requestSchema = z.object({
  toNumber: z.string().min(8),
  memberName: z.string().min(1).optional(),
  caregiverName: z.string().min(1).optional(),
  preferredVoiceId: z.string().optional().default(defaultVoiceId),
  firstMessage: z.string().trim().min(1).max(500).optional(),
});

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid ElevenLabs test call request." }, { status: 400 });
  }

  let callAttemptId: string | null = null;

  try {
    const normalizedPhone = parsed.data.toNumber.replace(/\s+/g, "");
    const preferredVoiceId = isAllowedVoiceId(parsed.data.preferredVoiceId) ? parsed.data.preferredVoiceId : defaultVoiceId;
    const customer = await prisma.customer.upsert({
      where: { email: "elevenlabs-test@dailycall.local" },
      update: { fullName: "ElevenLabs Test", phoneNumber: "+16043138398" },
      create: {
        email: "elevenlabs-test@dailycall.local",
        fullName: "ElevenLabs Test",
        phoneNumber: "+16043138398",
      },
    });
    const existingMember = await prisma.member.findFirst({
      where: { customerId: customer.id, phoneNumber: normalizedPhone },
    });
    const member = existingMember
      ? await prisma.member.update({
          where: { id: existingMember.id },
          data: { name: parsed.data.memberName ?? existingMember.name, preferredVoiceId },
        })
      : await prisma.member.create({
          data: {
            customerId: customer.id,
            name: parsed.data.memberName ?? "ElevenLabs phone test",
            phoneNumber: normalizedPhone,
            timezone: "America/Los_Angeles",
            preferredCallTime: "ElevenLabs phone test",
            preferredVoiceId,
          },
        });

    const callAttempt = await prisma.callAttempt.create({
      data: {
        memberId: member.id,
        scheduledFor: new Date(),
        startedAt: new Date(),
        status: "IN_PROGRESS",
        summary: `ElevenLabs Twilio test call is being placed for ${member.name}.`,
        conversationRaw: {
          demoCurrentContext:
            "Internal ElevenLabs voice test. Do not perform or wait on live current-events, news, weather, or sports lookup. Keep responses short, warm, and immediate.",
          demoMaxDurationSeconds: TEST_CALL_MAX_DURATION_SECONDS,
          firstMessage:
            parsed.data.firstMessage ??
            `Hi ${member.name}, this is DailyCall calling through the ElevenLabs test path. How are you doing today?`,
        },
      },
    });
    callAttemptId = callAttempt.id;

    const result = await startAmdProtectedCheckInCall({
      toNumber: normalizedPhone,
      callAttemptId: callAttempt.id,
      memberName: member.name,
      caregiverName: parsed.data.caregiverName ?? "DailyCall ElevenLabs test reviewer",
      voiceProvider: "elevenlabs_twilio",
      refreshCurrentContext: false,
    });

    if (result.sid) {
      scheduleTwilioCallEnd(result.sid, TEST_CALL_MAX_DURATION_SECONDS * 1000);
    }

    const updatedCallAttempt = await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: {
        providerCallSid: result.sid ?? null,
        summary: `ElevenLabs Twilio test call started for ${member.name}.`,
        syncedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      provider: "elevenlabs_twilio",
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
          summary: error instanceof Error ? error.message : "ElevenLabs test call could not be started.",
          syncedAt: new Date(),
        },
      });
    }
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown ElevenLabs test call error.",
      },
      { status: 502 },
    );
  }
}
