import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getDailyCallOutboundFromNumber, getServerEnv } from "@/lib/env";
import { getPublicBaseUrl } from "@/lib/cartesia-test-call";
import { defaultVoiceId } from "@/lib/voice/voice-options";

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

    const callAttempt = await prisma.callAttempt.create({
      data: {
        memberId: member.id,
        scheduledFor: new Date(),
        startedAt: new Date(),
        status: "IN_PROGRESS",
        summary: `Streaming bridge phone test started for ${member.name}.`,
        conversationRaw: {
          provider: "openai_realtime_stt_openai_text_elevenlabs_stream_twilio",
          elevenLabsConfig: {
            voiceId: defaultVoiceId,
            modelId: "eleven_flash_v2_5",
          },
          initialPrompt:
            parsed.data.firstMessage ??
            `Hi ${member.name}, this is DailyCall through the ElevenLabs streaming bridge. I am here if anything is on your mind, or if you would just like a quick chat. How are you doing today?`,
          hybridTranscript: [],
        } as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
    });

    const env = getServerEnv();
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials are not configured.");
    }

    if (!env.ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured.");
    }

    const baseUrl = getPublicBaseUrl();
    const voiceUrl = new URL(`${baseUrl}/api/bridge-test/stream-twiml`);
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
      throw new Error(result?.message ?? `Twilio call failed with status ${response.status}.`);
    }

    if (result?.sid) {
      await prisma.callAttempt.update({
        where: { id: callAttempt.id },
        data: { providerCallSid: result.sid, syncedAt: new Date() },
      });
    }

    return NextResponse.json({
      ok: true,
      provider: "openai_realtime_stt_openai_text_elevenlabs_stream_twilio",
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
