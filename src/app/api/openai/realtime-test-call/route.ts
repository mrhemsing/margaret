import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { getDailyCallOutboundFromNumber, getServerEnv } from "@/lib/env";
import { buildOpenAIRealtimeSipTwiml } from "@/lib/voice/openai-realtime";

export const dynamic = "force-dynamic";

const requestSchema = z.object({
  toNumber: z.string().min(8),
  memberName: z.string().min(1).optional(),
  caregiverName: z.string().min(1).optional(),
  firstMessage: z.string().trim().min(1).max(500).optional(),
  realtimeModel: z.enum(["gpt-realtime", "gpt-realtime-2"]).optional(),
});

type TwilioCallResponse = {
  sid?: string;
  status?: string;
  message?: string;
};

function getPublicBaseUrl() {
  return (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://dailycall.care").replace(/\/$/, "");
}

async function startOpenAIRealtimeConferenceCall(input: {
  toNumber: string;
  callAttemptId: string;
}) {
  const env = getServerEnv();

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials are not configured.");
  }

  const twiml = buildOpenAIRealtimeSipTwiml({
    callAttemptId: input.callAttemptId,
  });

  const body = new URLSearchParams({
    To: input.toNumber,
    From: getDailyCallOutboundFromNumber(),
    Twiml: twiml,
    StatusCallback: `${getPublicBaseUrl()}/api/twilio/openai-sip-dial-status?callAttemptId=${encodeURIComponent(input.callAttemptId)}`,
    StatusCallbackMethod: "POST",
  });

  for (const event of ["initiated", "ringing", "answered", "completed"]) {
    body.append("StatusCallbackEvent", event);
  }

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
    throw new Error(payload?.message ?? `Twilio OpenAI conference call failed with status ${response.status}`);
  }

  if (!payload?.sid) {
    throw new Error("Twilio did not return a call SID.");
  }

  return payload;
}

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

  let callAttemptId: string | null = null;

  try {
    const normalizedPhone = parsed.data.toNumber.replaceAll(" ", "");
    const customer = await prisma.customer.upsert({
      where: { email: "realtime-test@dailycall.local" },
      update: { fullName: "Realtime Test", phoneNumber: "+16043138398" },
      create: {
        email: "realtime-test@dailycall.local",
        fullName: "Realtime Test",
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
            name: parsed.data.memberName ?? "Realtime phone test",
            phoneNumber: normalizedPhone,
            timezone: "America/Los_Angeles",
            preferredCallTime: "OpenAI realtime phone test",
          },
        });

    const callAttempt = await prisma.callAttempt.create({
      data: {
        memberId: member.id,
        scheduledFor: new Date(),
        startedAt: new Date(),
        status: "IN_PROGRESS",
        summary: `OpenAI Realtime phone test started for ${member.name}.`,
        conversationRaw: {
          provider: "openai_realtime",
          openAISipMode: "direct_sip_clean",
          initialPrompt: parsed.data.firstMessage ?? null,
          realtimeModel: parsed.data.realtimeModel ?? null,
        },
      },
    });
    callAttemptId = callAttempt.id;
    const result = await startOpenAIRealtimeConferenceCall({
      toNumber: normalizedPhone,
      callAttemptId: callAttempt.id,
    });
    const updatedCallAttempt = await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: {
        providerCallSid: result.sid,
        conversationRaw: {
          provider: "openai_realtime",
          openAISipMode: "direct_sip_clean",
          initialPrompt: parsed.data.firstMessage ?? null,
          realtimeModel: parsed.data.realtimeModel ?? null,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      provider: "openai_realtime_twilio",
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
          summary: error instanceof Error ? error.message : "OpenAI realtime test call could not be started.",
          syncedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown OpenAI realtime test call error.",
      },
      { status: 502 },
    );
  }
}
