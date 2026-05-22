import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { scheduleTwilioCallEnd, startOutboundCheckInCall } from "@/lib/voice/elevenlabs";
import { defaultVoiceId, isAllowedVoiceId } from "@/lib/voice/voice-options";

const requestSchema = z.object({
  phoneNumber: z.string().min(8).max(30),
  firstName: z.string().trim().max(40).optional(),
  preferredVoiceId: z.string().optional().default(defaultVoiceId),
  company: z.string().optional(),
});

const demoCallAttempts = new Map<string, number>();
const DEMO_COOLDOWN_MS = 10 * 60 * 1000;
const DEMO_MAX_DURATION_SECONDS = 60;
const DEMO_CURRENT_CONTEXT = "Landing-page demo call. Do not perform or wait on live current-events, news, weather, or sports lookup. Keep responses short, warm, and immediate.";

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  if (hasPlus && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid phone number to try a demo call." }, { status: 400 });
  }

  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }

  const phoneNumber = normalizePhoneNumber(parsed.data.phoneNumber);

  if (!phoneNumber) {
    return NextResponse.json({ ok: false, error: "Enter a valid US or Canadian phone number." }, { status: 400 });
  }

  const now = Date.now();
  const lastAttempt = demoCallAttempts.get(phoneNumber) ?? 0;

  if (now - lastAttempt < DEMO_COOLDOWN_MS) {
    return NextResponse.json(
      { ok: false, error: "A demo call was just requested for this number. Please wait a few minutes before trying again." },
      { status: 429 },
    );
  }

  demoCallAttempts.set(phoneNumber, now);

  const memberName = parsed.data.firstName?.trim() || "there";
  const preferredVoiceId = isAllowedVoiceId(parsed.data.preferredVoiceId) ? parsed.data.preferredVoiceId : defaultVoiceId;

  try {
    const providerStartedAt = Date.now();
    const result = await startOutboundCheckInCall({
      toNumber: phoneNumber,
      memberName,
      caregiverName: "your family",
      currentContext: DEMO_CURRENT_CONTEXT,
      demoMaxDurationSeconds: DEMO_MAX_DURATION_SECONDS,
      preferredVoiceId,
      firstMessage: `Hi ${memberName}, this is DailyCall. I am an AI companion calling with a quick demo, just so you can hear what the service feels like. How are you doing today?`,
    });
    const providerMs = Date.now() - providerStartedAt;

    if (!result) {
      throw new Error("Demo call provider did not return a result.");
    }

    if (result.callSid) {
      scheduleTwilioCallEnd(result.callSid, DEMO_MAX_DURATION_SECONDS * 1000);
    }

    const customer = await prisma.customer.upsert({
      where: { email: "demo-family@dailycall.local" },
      update: { fullName: "Demo Family", phoneNumber: phoneNumber },
      create: {
        email: "demo-family@dailycall.local",
        fullName: "Demo Family",
        phoneNumber,
      },
    });

    const existingMember = await prisma.member.findFirst({ where: { phoneNumber } });
    const member = existingMember
      ? await prisma.member.update({
          where: { id: existingMember.id },
          data: { customerId: customer.id, name: memberName, preferredVoiceId },
        })
      : await prisma.member.create({
          data: {
            customerId: customer.id,
            name: memberName,
            phoneNumber,
            timezone: "America/Los_Angeles",
            preferredCallTime: "Landing page demo",
            preferredVoiceId,
          },
        });

    await prisma.callAttempt.create({
      data: {
        memberId: member.id,
        scheduledFor: new Date(),
        startedAt: new Date(),
        status: "IN_PROGRESS",
        providerCallSid: result.callSid ?? null,
        providerConversationId: result.conversation_id ?? null,
        summary: `Landing page demo call started for ${member.name}. Demo calls skip live current-info lookup to keep turn-taking fast.`,
      },
    });

    console.log("Demo call started", {
      phoneNumber,
      providerMs,
      totalMs: Date.now() - startedAt,
      hasCallSid: Boolean(result.callSid),
      hasConversationId: Boolean(result.conversation_id),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    demoCallAttempts.delete(phoneNumber);
    console.error("Demo call failed", {
      phoneNumber,
      totalMs: Date.now() - startedAt,
      error,
    });
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "We could not start the demo call. Please try again." },
      { status: 502 },
    );
  }
}
