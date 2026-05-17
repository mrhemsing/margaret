import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { scheduleTwilioCallEnd } from "@/lib/voice/elevenlabs";
import { startAmdProtectedCheckInCall } from "@/lib/voice/twilio";

const requestSchema = z.object({
  phoneNumber: z.string().min(8).max(30),
  firstName: z.string().trim().max(40).optional(),
  company: z.string().optional(),
});

const demoCallAttempts = new Map<string, number>();
const DEMO_COOLDOWN_MS = 10 * 60 * 1000;
const DEMO_MAX_DURATION_SECONDS = 60;

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

  try {
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
          data: { customerId: customer.id, name: memberName },
        })
      : await prisma.member.create({
          data: {
            customerId: customer.id,
            name: memberName,
            phoneNumber,
            timezone: "America/Los_Angeles",
            preferredCallTime: "Landing page demo",
          },
        });

    const result = await startAmdProtectedCheckInCall({
      toNumber: phoneNumber,
      memberName,
      caregiverName: "your family",
    });

    if (!result) {
      throw new Error("Demo call provider did not return a result.");
    }

    if (result.sid) {
      scheduleTwilioCallEnd(result.sid, DEMO_MAX_DURATION_SECONDS * 1000);
    }

    await prisma.callAttempt.create({
      data: {
        memberId: member.id,
        scheduledFor: new Date(),
        startedAt: new Date(),
        status: "IN_PROGRESS",
        providerCallSid: result.sid ?? null,
        summary: `Landing page demo call started for ${member.name}.`,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    demoCallAttempts.delete(phoneNumber);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "We could not start the demo call. Please try again." },
      { status: 502 },
    );
  }
}
