import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function mapTwilioStatus(callStatus: string | null) {
  if (callStatus === "busy" || callStatus === "no-answer" || callStatus === "canceled") return "NO_RESPONSE";
  if (callStatus === "failed") return "FAILED";
  return null;
}

function isTerminalStatus(status: string | null | undefined) {
  return status === "ANSWERED_OK" || status === "HELP_REQUESTED" || status === "FOLLOW_UP_NEEDED" || status === "NO_RESPONSE" || status === "FAILED";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const callSid = String(formData.get("CallSid") ?? "");
  const callStatus = String(formData.get("CallStatus") ?? "");
  const mappedStatus = mapTwilioStatus(callStatus);

  if (callSid && (mappedStatus || callStatus === "completed")) {
    const existingCall = await prisma.callAttempt.findFirst({
      where: { providerCallSid: callSid },
      select: { providerConversationId: true, status: true, summary: true },
    });
    const openAISipBridgeDidNotConnect =
      callStatus === "completed" &&
      !existingCall?.providerConversationId &&
      existingCall?.summary?.includes("OpenAI Realtime");
    const completedWithoutConfirmedConversation =
      callStatus === "completed" &&
      !openAISipBridgeDidNotConnect &&
      !existingCall?.providerConversationId &&
      !isTerminalStatus(existingCall?.status);

    const nextStatus = isTerminalStatus(existingCall?.status)
      ? existingCall.status
      : openAISipBridgeDidNotConnect
        ? "FAILED"
        : completedWithoutConfirmedConversation
          ? "NO_RESPONSE"
          : mappedStatus ?? existingCall?.status ?? "IN_PROGRESS";

    await prisma.callAttempt.updateMany({
      where: { providerCallSid: callSid },
      data: {
        status: nextStatus,
        completedAt: isTerminalStatus(nextStatus) ? new Date() : undefined,
        summary: openAISipBridgeDidNotConnect
          ? "The call was answered, but DailyCall could not start the conversation before the call ended."
          : completedWithoutConfirmedConversation
            ? "Call ended before DailyCall could confirm a live conversation. Treating it as no answer or voicemail."
          : undefined,
        conversationRaw: Object.fromEntries(formData.entries()) as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
