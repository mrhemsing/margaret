import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveDemoCallName } from "@/lib/demo-name-validation";
import { prisma } from "@/lib/db";
import { scheduleTwilioCallEnd } from "@/lib/voice/elevenlabs";
import { startAmdProtectedCheckInCall } from "@/lib/voice/twilio";
import { defaultVoiceId, isAllowedVoiceId } from "@/lib/voice/voice-options";

const requestSchema = z.object({
  phoneNumber: z.string().min(8).max(30),
  firstName: z.string().trim().max(200).optional(),
  preferredVoiceId: z.string().optional().default(defaultVoiceId),
  source: z.string().trim().max(60).optional(),
  utm: z
    .object({
      utm_source: z.string().trim().max(120).optional(),
      utm_medium: z.string().trim().max(120).optional(),
      utm_campaign: z.string().trim().max(180).optional(),
      utm_content: z.string().trim().max(180).optional(),
    })
    .optional(),
  company: z.string().optional(),
});

const demoCallAttempts = new Map<string, number[]>();
const DEMO_RATE_LIMIT_WINDOW_MS = 22 * 60 * 60 * 1000;
const DEMO_RATE_LIMIT_MAX_ATTEMPTS = 1;
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

function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("true-client-ip") ??
    request.headers.get("x-real-ip") ??
    forwardedFor ??
    null
  );
}

function getRecentAttempts(key: string, now: number) {
  const windowStart = now - DEMO_RATE_LIMIT_WINDOW_MS;
  const recentAttempts = (demoCallAttempts.get(key) ?? []).filter((timestamp) => timestamp >= windowStart);
  demoCallAttempts.set(key, recentAttempts);
  return recentAttempts;
}

function isRateLimited(key: string, now: number) {
  return getRecentAttempts(key, now).length >= DEMO_RATE_LIMIT_MAX_ATTEMPTS;
}

function recordRateLimitAttempt(key: string, now: number) {
  const recentAttempts = getRecentAttempts(key, now);
  recentAttempts.push(now);
  demoCallAttempts.set(key, recentAttempts);
}

function clearRateLimitAttempt(key: string, timestamp: number) {
  const attempts = (demoCallAttempts.get(key) ?? []).filter((attempt) => attempt !== timestamp);
  if (attempts.length) {
    demoCallAttempts.set(key, attempts);
  } else {
    demoCallAttempts.delete(key);
  }
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
  const requestIp = getRequestIp(request);
  const phoneLimitKey = `phone:${phoneNumber}`;
  const ipLimitKey = requestIp ? `ip:${requestIp}` : null;

  if (isRateLimited(phoneLimitKey, now) || (ipLimitKey ? isRateLimited(ipLimitKey, now) : false)) {
    return NextResponse.json(
      { ok: false, error: "A demo call was already requested recently. Please try again tomorrow." },
      { status: 429 },
    );
  }

  const recentDemoCall = await prisma.callAttempt.findFirst({
    where: {
      createdAt: { gte: new Date(now - DEMO_RATE_LIMIT_WINDOW_MS) },
      member: {
        phoneNumber,
        OR: [{ preferredCallTime: "Landing page demo" }, { customer: { email: "demo-family@dailycall.local" } }],
      },
    },
    select: { id: true },
  });

  if (recentDemoCall) {
    return NextResponse.json(
      { ok: false, error: "A demo call was already requested for this number recently. Please try again tomorrow." },
      { status: 429 },
    );
  }

  const memberNameResult = await resolveDemoCallName(parsed.data.firstName);

  recordRateLimitAttempt(phoneLimitKey, now);
  if (ipLimitKey) recordRateLimitAttempt(ipLimitKey, now);

  const memberName = memberNameResult.name;
  const firstMessage = memberNameResult.personalized
    ? `Hi ${memberName}, this is DailyCall. I am an AI companion calling with a quick demo, just so you can hear what the service feels like. How are you doing today?`
    : "Hi there, this is DailyCall. I am an AI companion calling with a quick demo, just so you can hear what the service feels like. How are you doing today?";
  const preferredVoiceId = isAllowedVoiceId(parsed.data.preferredVoiceId) ? parsed.data.preferredVoiceId : defaultVoiceId;
  let callAttemptId: string | null = null;

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

    const existingMember = await prisma.member.findFirst({
      where: { customerId: customer.id, phoneNumber, preferredCallTime: "Landing page demo" },
    });
    const member = existingMember
      ? await prisma.member.update({
          where: { id: existingMember.id },
          data: { name: memberName, preferredVoiceId },
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

    await prisma.seniorMemory.upsert({
      where: { memberId: member.id },
      update: { preferredName: memberName },
      create: { memberId: member.id, preferredName: memberName },
    });

    const callAttempt = await prisma.callAttempt.create({
      data: {
        memberId: member.id,
        scheduledFor: new Date(),
        startedAt: new Date(),
        status: "IN_PROGRESS",
        summary: `Landing page demo call is being placed for ${member.name}. Demo calls skip live current-info lookup to keep turn-taking fast.`,
        conversationRaw: {
          demoCurrentContext: DEMO_CURRENT_CONTEXT,
          demoMaxDurationSeconds: DEMO_MAX_DURATION_SECONDS,
          source: parsed.data.source ?? "main_site",
          utm: parsed.data.utm ?? null,
          firstMessage,
          requestIp,
          submittedFirstName: parsed.data.firstName ?? null,
          submittedFirstNamePersonalized: memberNameResult.personalized,
          submittedFirstNameValidationReason: memberNameResult.reason,
        },
      },
    });
    callAttemptId = callAttempt.id;

    const providerStartedAt = Date.now();
    const result = await startAmdProtectedCheckInCall({
      toNumber: phoneNumber,
      callAttemptId: callAttempt.id,
      memberName,
      caregiverName: "your family",
      voiceProvider: "elevenlabs_twilio",
      refreshCurrentContext: false,
    });
    const providerMs = Date.now() - providerStartedAt;

    if (result.sid) {
      scheduleTwilioCallEnd(result.sid, DEMO_MAX_DURATION_SECONDS * 1000);
    }

    await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: {
        providerCallSid: result.sid ?? null,
        summary: `Landing page demo call started for ${member.name}. Demo calls skip live current-info lookup to keep turn-taking fast.`,
        syncedAt: new Date(),
      },
    });

    console.log("Demo call started", {
      phoneNumber,
      providerMs,
      totalMs: Date.now() - startedAt,
      hasCallSid: Boolean(result.sid),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    clearRateLimitAttempt(phoneLimitKey, now);
    if (ipLimitKey) clearRateLimitAttempt(ipLimitKey, now);
    if (callAttemptId) {
      await prisma.callAttempt.update({
        where: { id: callAttemptId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          summary: error instanceof Error ? error.message : "Demo call could not be started.",
          syncedAt: new Date(),
        },
      });
    }
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
