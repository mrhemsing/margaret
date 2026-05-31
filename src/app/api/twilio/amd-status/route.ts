import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { getServerEnv } from "@/lib/env";

function isMachine(answeredBy: string) {
  const value = answeredBy.toLowerCase();
  return value.startsWith("machine") || value === "fax";
}

async function endCall(callSid: string) {
  const env = getServerEnv();

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    throw new Error("Twilio credentials are not configured.");
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls/${callSid}.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ Status: "completed" }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Twilio call end failed with status ${response.status}.`);
  }
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const callSid = String(formData.get("CallSid") ?? "");
  const answeredBy = String(formData.get("AnsweredBy") ?? "");

  if (!callSid || !answeredBy) {
    return NextResponse.json({ ok: true });
  }

  if (!isMachine(answeredBy)) {
    return NextResponse.json({ ok: true, answeredBy });
  }

  try {
    await endCall(callSid);
  } catch (error) {
    console.error("Failed to end async AMD machine call", error);
  }

  await prisma.callAttempt.updateMany({
    where: { providerCallSid: callSid },
    data: {
      status: "NO_RESPONSE",
      completedAt: new Date(),
      summary: "Voicemail or answering machine detected asynchronously. DailyCall ended the call.",
      conversationRaw: Object.fromEntries(formData.entries()) as Prisma.InputJsonValue,
      syncedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, answeredBy, ended: true });
}
