import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function mapTwilioStatus(callStatus: string | null) {
  if (callStatus === "completed") return "ANSWERED_OK";
  if (callStatus === "busy" || callStatus === "no-answer" || callStatus === "canceled") return "NO_RESPONSE";
  if (callStatus === "failed") return "FAILED";
  return null;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const callSid = String(formData.get("CallSid") ?? "");
  const callStatus = String(formData.get("CallStatus") ?? "");
  const mappedStatus = mapTwilioStatus(callStatus);

  if (callSid && mappedStatus) {
    await prisma.callAttempt.updateMany({
      where: { providerCallSid: callSid },
      data: {
        status: mappedStatus,
        completedAt: ["ANSWERED_OK", "NO_RESPONSE", "FAILED"].includes(mappedStatus) ? new Date() : undefined,
        conversationRaw: Object.fromEntries(formData.entries()) as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
