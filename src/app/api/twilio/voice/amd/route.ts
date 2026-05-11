import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendExampleVoicemailAlertSmsToTeam } from "@/lib/sms/twilio";
import { getServerEnv } from "@/lib/env";
import { getElevenLabsBridgeNumber } from "@/lib/voice/twilio";

function twiml(xml: string) {
  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function isMachine(answeredBy: string | null) {
  if (!answeredBy) return false;
  return answeredBy.toLowerCase().startsWith("machine") || answeredBy.toLowerCase() === "fax";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const callSid = String(formData.get("CallSid") ?? "");
  const answeredBy = String(formData.get("AnsweredBy") ?? "");

  if (callSid && isMachine(answeredBy)) {
    const summary = "Voicemail or answering machine detected. Dailycall hung up without leaving a voicemail message.";
    const callAttempt = await prisma.callAttempt.findFirst({
      where: { providerCallSid: callSid },
      include: { member: true },
    });
    let alertSentAt = callAttempt?.alertSentAt ?? null;

    if (callAttempt && !alertSentAt) {
      try {
        await sendExampleVoicemailAlertSmsToTeam({
          memberName: callAttempt.member.name,
          summary,
        });
        alertSentAt = new Date();
      } catch (error) {
        console.error("Failed to send voicemail alert SMS", error);
      }
    }

    const retryAttempt = callAttempt?.retryAttempt ?? 0;
    const retryLimit = callAttempt?.member.voicemailRetryCount ?? 0;
    const retryDelayMins = callAttempt?.member.voicemailRetryDelayMins ?? 15;
    let retryScheduledFor: Date | null = null;

    if (callAttempt && retryAttempt < retryLimit) {
      const existingRetry = await prisma.callAttempt.findFirst({
        where: {
          retryOfCallAttemptId: callAttempt.id,
          status: "SCHEDULED",
        },
      });

      if (!existingRetry) {
        retryScheduledFor = new Date(Date.now() + retryDelayMins * 60 * 1000);
        await prisma.callAttempt.create({
          data: {
            memberId: callAttempt.memberId,
            scheduledFor: retryScheduledFor,
            status: "SCHEDULED",
            retryAttempt: retryAttempt + 1,
            retryOfCallAttemptId: callAttempt.id,
            summary: `Retry ${retryAttempt + 1} of ${retryLimit} scheduled after voicemail detection.`,
          },
        });
      } else {
        retryScheduledFor = existingRetry.scheduledFor;
      }
    }

    await prisma.callAttempt.updateMany({
      where: { providerCallSid: callSid },
      data: {
        status: "NO_RESPONSE",
        completedAt: new Date(),
        summary: retryScheduledFor ? `${summary} Retry scheduled for ${retryScheduledFor.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: callAttempt?.member.timezone ?? "America/Los_Angeles" })}.` : summary,
        conversationRaw: Object.fromEntries(formData.entries()) as Prisma.InputJsonValue,
        syncedAt: new Date(),
        alertSentAt,
      },
    });

    return twiml("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Hangup /></Response>");
  }

  if (callSid) {
    await prisma.callAttempt.updateMany({
      where: { providerCallSid: callSid },
      data: {
        status: "IN_PROGRESS",
        startedAt: new Date(),
        summary: "Human answer detected. Dailycall is connecting the call to the voice agent.",
        conversationRaw: Object.fromEntries(formData.entries()) as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
    });
  }

  const env = getServerEnv();
  const bridgeNumber = getElevenLabsBridgeNumber();

  if (!bridgeNumber || bridgeNumber === env.TWILIO_FROM_NUMBER) {
    if (callSid) {
      await prisma.callAttempt.updateMany({
        where: { providerCallSid: callSid },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          summary: "Human answer detected, but voicemail-safe bridging requires a second Twilio number connected to ElevenLabs.",
          syncedAt: new Date(),
        },
      });
    }

    return twiml(
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Say>Dailycall is not fully configured yet. Goodbye.</Say><Hangup /></Response>",
    );
  }

  return twiml(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Dial answerOnBridge="true" callerId="${env.TWILIO_FROM_NUMBER}"><Number>${bridgeNumber}</Number></Dial></Response>`,
  );
}
