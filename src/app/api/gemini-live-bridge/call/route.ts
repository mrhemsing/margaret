import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getPublicBaseUrl } from "@/lib/cartesia-test-call";
import { prisma } from "@/lib/db";
import { getDailyCallOutboundFromNumber, getServerEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  toNumber: z.string().min(8),
  memberName: z.string().min(1).optional(),
  caregiverName: z.string().min(1).optional(),
  firstMessage: z.string().trim().min(1).max(500).optional(),
});

type TwilioCallResponse = {
  sid?: string;
  status?: string;
  message?: string;
};

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

  const env = getServerEnv();

  if (!env.GEMINI_API_KEY) {
    return NextResponse.json({ ok: false, error: "GEMINI_API_KEY is not configured." }, { status: 503 });
  }

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return NextResponse.json({ ok: false, error: "Twilio call credentials are not configured." }, { status: 503 });
  }

  const normalizedPhone = parsed.data.toNumber.replace(/\s+/g, "");

  const customer = await prisma.customer.upsert({
    where: { email: "gemini-live-test@dailycall.local" },
    update: { fullName: "Gemini Live Test", phoneNumber: "+16043138398" },
    create: {
      email: "gemini-live-test@dailycall.local",
      fullName: "Gemini Live Test",
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
          name: parsed.data.memberName ?? "Gemini Live phone test",
          phoneNumber: normalizedPhone,
          timezone: "America/Los_Angeles",
          preferredCallTime: "Gemini Live bridge phone test",
        },
      });

  const callAttempt = await prisma.callAttempt.create({
    data: {
      memberId: member.id,
      scheduledFor: new Date(),
      startedAt: new Date(),
      status: "IN_PROGRESS",
      summary: `Gemini Live bridge phone test started for ${member.name}.`,
      conversationRaw: {
        provider: "gemini_live_native_audio_stream_twilio",
        geminiConfig: {
          modelId: "gemini-2.5-flash-native-audio-preview-12-2025",
          inputFormat: "pcm16_16000",
          outputFormat: "pcm16_24000",
        },
        initialPrompt:
          parsed.data.firstMessage ??
          `Hi ${member.name}, it is DailyCall. How are you doing today?`,
        hybridTranscript: [],
      } as Prisma.InputJsonValue,
      syncedAt: new Date(),
    },
  });

  const baseUrl = getPublicBaseUrl();
  const voiceUrl = new URL(`${baseUrl}/api/gemini-live-bridge/stream-twiml`);
  voiceUrl.searchParams.set("callAttemptId", callAttempt.id);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: normalizedPhone,
      From: getDailyCallOutboundFromNumber(),
      Url: voiceUrl.toString(),
      Method: "POST",
    }),
  });

  const result = (await response.json().catch(() => null)) as TwilioCallResponse | null;

  if (!response.ok) {
    await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        summary: result?.message ?? `Twilio call failed with status ${response.status}.`,
        syncedAt: new Date(),
      },
    });

    return NextResponse.json(
      { ok: false, error: result?.message ?? `Twilio call failed with status ${response.status}.` },
      { status: 502 },
    );
  }

  if (result?.sid) {
    await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: { providerCallSid: result.sid, syncedAt: new Date() },
    });
  }

  return NextResponse.json({
    ok: true,
    result: {
      sid: result?.sid ?? null,
      status: result?.status ?? null,
    },
  });
}
