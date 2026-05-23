import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

function twiml(xml: string) {
  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function getRawObject(raw: Prisma.JsonValue | null | undefined) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const formData = await request.formData();
  const callSid = url.searchParams.get("callSid") ?? getString(formData, "CallSid");
  const callAttemptId = url.searchParams.get("callAttemptId");
  const dialCallSid = getString(formData, "DialCallSid");
  const dialCallStatus = getString(formData, "DialCallStatus");
  const sipResponseCode = getString(formData, "DialSipResponseCode") || getString(formData, "SipResponseCode");
  const sipCallId = getString(formData, "DialSipCallId") || getString(formData, "SipCallId");
  const raw = Object.fromEntries(formData.entries()) as Prisma.InputJsonObject;

  if (callSid) {
    const existingCall = await prisma.callAttempt.findFirst({
      where: callAttemptId ? { id: callAttemptId } : { providerCallSid: callSid },
      select: { conversationRaw: true },
    });
    const existingRaw = getRawObject(existingCall?.conversationRaw);
    const failed = ["failed", "busy", "no-answer", "canceled"].includes(dialCallStatus);
    const connected = ["answered", "completed"].includes(dialCallStatus);
    const diagnosticParts = [
      "OpenAI Realtime SIP dial completed.",
      dialCallStatus ? `Dial status: ${dialCallStatus}.` : null,
      sipResponseCode ? `SIP response: ${sipResponseCode}.` : null,
      dialCallSid ? `SIP child call: ${dialCallSid}.` : null,
      sipCallId ? `SIP Call-ID: ${sipCallId}.` : null,
    ].filter(Boolean);

    await prisma.callAttempt.updateMany({
      where: callAttemptId ? { id: callAttemptId } : { providerCallSid: callSid },
      data: {
        status: failed ? "FAILED" : undefined,
        completedAt: failed ? new Date() : undefined,
        summary: connected
          ? undefined
          : diagnosticParts.join(" ") || "OpenAI Realtime SIP dial ended before the call connected.",
        conversationRaw: {
          ...existingRaw,
          provider: "openai_realtime",
          twilioOpenAISipDialStatus: raw,
        } as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
    });
  }

  return twiml("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response />");
}
