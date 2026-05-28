import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { cartesiaTestCallSchema, getPublicBaseUrl } from "@/lib/cartesia-test-call";
import { prisma } from "@/lib/db";
import { getDailyCallOutboundFromNumber, getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

type TwilioCallResponse = {
  sid?: string;
  status?: string;
  message?: string;
};

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Not authenticated." }, { status: 401 });
  }

  const parsed = cartesiaTestCallSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid Cartesia test call request." }, { status: 400 });
  }

  const env = getServerEnv();

  if (!env.CARTESIA_API_KEY) {
    return NextResponse.json({ ok: false, error: "CARTESIA_API_KEY is not configured." }, { status: 503 });
  }

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return NextResponse.json({ ok: false, error: "Twilio call credentials are not configured." }, { status: 503 });
  }

  const baseUrl = getPublicBaseUrl();
  const normalizedPhone = parsed.data.toNumber.replace(/\s+/g, "");

  const customer = await prisma.customer.upsert({
    where: { email: "cartesia-test@dailycall.local" },
    update: { fullName: "Cartesia Test", phoneNumber: "+16043138398" },
    create: {
      email: "cartesia-test@dailycall.local",
      fullName: "Cartesia Test",
      phoneNumber: "+16043138398",
    },
  });

  const existingMember = await prisma.member.findFirst({
    where: { customerId: customer.id, phoneNumber: normalizedPhone },
  });
  const member = existingMember
    ? await prisma.member.update({
        where: { id: existingMember.id },
        data: { name: parsed.data.memberName },
      })
    : await prisma.member.create({
        data: {
          customerId: customer.id,
          name: parsed.data.memberName,
          phoneNumber: normalizedPhone,
          timezone: "America/Los_Angeles",
          preferredCallTime: "Cartesia live phone test",
        },
      });

  const callAttempt = await prisma.callAttempt.create({
    data: {
      memberId: member.id,
      scheduledFor: new Date(),
      startedAt: new Date(),
      status: "IN_PROGRESS",
      summary: `Cartesia live phone test started for ${member.name}.`,
      conversationRaw: {
        provider: "openai_text_cartesia_twilio",
        cartesiaConfig: {
          modelId: parsed.data.modelId,
          voiceId: parsed.data.voiceId,
        },
        initialPrompt: parsed.data.transcript,
        hybridTranscript: [],
      } as Prisma.InputJsonValue,
      syncedAt: new Date(),
    },
  });

  const voiceUrl = new URL(`${baseUrl}/api/cartesia-test/stream-twiml`);
  voiceUrl.searchParams.set("callAttemptId", callAttempt.id);

  const body = new URLSearchParams({
    To: normalizedPhone,
    From: getDailyCallOutboundFromNumber(),
    Url: voiceUrl.toString(),
    Method: "POST",
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = (await response.json().catch(() => null)) as TwilioCallResponse | null;

  if (!response.ok) {
    await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        summary: payload?.message ?? `Twilio call failed with status ${response.status}.`,
        syncedAt: new Date(),
      },
    });

    return NextResponse.json(
      { ok: false, error: payload?.message ?? `Twilio call failed with status ${response.status}.` },
      { status: 502 },
    );
  }

  if (payload?.sid) {
    await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: { providerCallSid: payload.sid, syncedAt: new Date() },
    });
  }

  return NextResponse.json({
    ok: true,
    result: {
      sid: payload?.sid ?? null,
      status: payload?.status ?? null,
    },
  });
}
