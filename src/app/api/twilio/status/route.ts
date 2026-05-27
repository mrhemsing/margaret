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
    const existingCall = await prisma.callAttempt.findFirst({
      where: { providerCallSid: callSid },
      select: { providerConversationId: true, summary: true },
    });
    const openAISipBridgeDidNotConnect =
      mappedStatus === "ANSWERED_OK" &&
      !existingCall?.providerConversationId &&
      existingCall?.summary?.includes("OpenAI Realtime");

    const nextStatus = openAISipBridgeDidNotConnect ? "FAILED" : mappedStatus;

    await prisma.callAttempt.updateMany({
      where: { providerCallSid: callSid },
      data: {
        status: nextStatus,
        completedAt: ["ANSWERED_OK", "NO_RESPONSE", "FAILED"].includes(nextStatus) ? new Date() : undefined,
        summary: openAISipBridgeDidNotConnect
          ? "The call was answered, but DailyCall could not start the conversation before the call ended."
          : undefined,
        conversationRaw: Object.fromEntries(formData.entries()) as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
