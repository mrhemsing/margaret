import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startAmdProtectedCheckInCall } from "@/lib/voice/twilio";
import { ensureUpcomingScheduledCalls } from "@/lib/calls/scheduling";
import { syncTranscripts } from "@/lib/calls/transcript-sync";
import { refreshMemberWeatherBriefing } from "@/lib/voice/current-info";

const PROCESSING_WINDOW_MS = 30 * 60 * 1000;
const ACTIVE_CALL_WITH_SID_WINDOW_MS = 2 * 60 * 60 * 1000;
const ACTIVE_CALL_WITHOUT_SID_WINDOW_MS = 10 * 60 * 1000;
const STALE_DEMO_CALL_WINDOW_MS = 10 * 60 * 1000;
const DEMO_CRON_CUSTOMER_EMAIL = "demo-family@dailycall.local";
const EXCLUDED_CRON_CUSTOMER_EMAILS = [DEMO_CRON_CUSTOMER_EMAIL, "example-family@dailycall.local"];
const EXCLUDED_CRON_PREFERRED_CALL_TIMES = ["Landing page demo", "On demand test", "OpenAI realtime phone test"];
const ALLOWED_DEMO_CRON_PHONE_NUMBERS = ["+16043138398"];
const cronEligibleMemberWhere = {
  preferredCallTime: { notIn: EXCLUDED_CRON_PREFERRED_CALL_TIMES },
  OR: [
    { customer: { email: { notIn: EXCLUDED_CRON_CUSTOMER_EMAILS } } },
    {
      phoneNumber: { in: ALLOWED_DEMO_CRON_PHONE_NUMBERS },
      customer: { email: DEMO_CRON_CUSTOMER_EMAIL },
    },
  ],
};

async function processScheduledCalls() {
  const now = new Date();
  const callableMemberWhere = {
    active: true,
    callsPaused: false,
    AND: [
      { OR: [{ callPausedUntil: null }, { callPausedUntil: { lte: now } }] },
      cronEligibleMemberWhere,
    ],
  };
  const transcriptSyncResponse = await syncTranscripts();
  const transcriptSyncResult = await transcriptSyncResponse.json().catch(() => null);
  const processingWindowStart = new Date(now.getTime() - PROCESSING_WINDOW_MS);
  const activeMembers = await prisma.member.findMany({
    where: callableMemberWhere,
    select: { id: true, active: true, callsPaused: true, callPausedUntil: true, preferredCallTime: true, timezone: true },
  });

  const scheduledMaintenance = await ensureUpcomingScheduledCalls(prisma, activeMembers);
  const staleDemoCallWindowStart = new Date(now.getTime() - STALE_DEMO_CALL_WINDOW_MS);

  const staleDemoCalls = await prisma.callAttempt.updateMany({
    where: {
      status: "IN_PROGRESS",
      startedAt: { lt: staleDemoCallWindowStart },
      providerConversationId: null,
      member: {
        OR: [
          { preferredCallTime: "Landing page demo" },
          { customer: { email: DEMO_CRON_CUSTOMER_EMAIL } },
        ],
      },
    },
    data: {
      status: "NO_RESPONSE",
      completedAt: now,
      summary: "Demo call was not answered or did not complete within the expected window.",
      syncedAt: now,
    },
  });

  const expiredCalls = await prisma.callAttempt.updateMany({
    where: {
      status: "SCHEDULED",
      scheduledFor: { lt: processingWindowStart },
      member: callableMemberWhere,
    },
    data: {
      status: "FAILED",
      completedAt: now,
      summary: "Scheduled call was missed because the call processor did not run in time.",
      syncedAt: now,
    },
  });

  const dueCalls = await prisma.callAttempt.findMany({
    where: {
      status: "SCHEDULED",
      member: callableMemberWhere,
      scheduledFor: {
        gte: processingWindowStart,
        lte: now,
      },
    },
    include: { member: true },
    orderBy: { scheduledFor: "asc" },
    take: 10,
  });
  const orderedDueCalls = dueCalls.sort((left, right) => {
    const scheduledDelta = left.scheduledFor.getTime() - right.scheduledFor.getTime();
    if (scheduledDelta !== 0) return scheduledDelta;

    return right.member.updatedAt.getTime() - left.member.updatedAt.getTime();
  });

  const results = [];
  const processedPhoneNumbers = new Set<string>();

  for (const call of orderedDueCalls) {
    const claimTime = new Date();
    if (processedPhoneNumbers.has(call.member.phoneNumber)) {
      await prisma.callAttempt.update({
        where: { id: call.id },
        data: {
          status: "FAILED",
          completedAt: claimTime,
          summary: "Skipped because another DailyCall to this phone number was already processed in this run.",
          syncedAt: claimTime,
        },
      });
      results.push({ id: call.id, ok: true, skipped: true, reason: "phone_call_already_processed" });
      continue;
    }

    const activeCallWithSidWindowStart = new Date(claimTime.getTime() - ACTIVE_CALL_WITH_SID_WINDOW_MS);
    const activeCallWithoutSidWindowStart = new Date(claimTime.getTime() - ACTIVE_CALL_WITHOUT_SID_WINDOW_MS);
    const activeCall = await prisma.callAttempt.findFirst({
      where: {
        id: { not: call.id },
        status: "IN_PROGRESS",
        member: {
          ...cronEligibleMemberWhere,
          OR: [
            { id: call.memberId },
            { phoneNumber: call.member.phoneNumber },
          ],
        },
        AND: [
          {
            OR: [
              { providerCallSid: { not: null }, startedAt: { gte: activeCallWithSidWindowStart } },
              { providerCallSid: null, startedAt: { gte: activeCallWithoutSidWindowStart } },
            ],
          },
        ],
      },
      select: { id: true, providerCallSid: true },
    });

    if (activeCall) {
      await prisma.callAttempt.update({
        where: { id: call.id },
        data: {
          status: "FAILED",
          completedAt: claimTime,
          summary: "Skipped because another DailyCall to this phone number was already in progress.",
          syncedAt: claimTime,
        },
      });
      results.push({ id: call.id, ok: true, skipped: true, reason: "phone_call_already_in_progress" });
      continue;
    }

    const claimed = await prisma.callAttempt.updateMany({
      where: {
        id: call.id,
        status: "SCHEDULED",
      },
      data: {
        status: "IN_PROGRESS",
        startedAt: claimTime,
        summary: call.retryAttempt > 0 ? `Retry ${call.retryAttempt} is being placed after voicemail detection.` : "Scheduled daily call is being placed.",
        syncedAt: claimTime,
      },
    });

    if (claimed.count === 0) {
      results.push({ id: call.id, ok: true, skipped: true, reason: "call_already_claimed" });
      continue;
    }

    processedPhoneNumbers.add(call.member.phoneNumber);

    try {
      await refreshMemberWeatherBriefing(prisma, call.member);

      const result = await startAmdProtectedCheckInCall({
        toNumber: call.member.phoneNumber,
        callAttemptId: call.id,
        memberName: call.member.name,
        caregiverName: "DailyCall team",
      });

      const updated = await prisma.callAttempt.update({
        where: { id: call.id },
        data: {
          providerCallSid: result.sid ?? null,
          summary: call.retryAttempt > 0 ? `Retry ${call.retryAttempt} started after voicemail detection.` : "Scheduled daily call started.",
          syncedAt: new Date(),
        },
      });

      results.push({ id: updated.id, ok: true, status: updated.status, callSid: updated.providerCallSid });
    } catch (error) {
      const updated = await prisma.callAttempt.update({
        where: { id: call.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          summary: error instanceof Error ? error.message : "Unknown scheduled retry error",
          syncedAt: new Date(),
        },
      });

      results.push({ id: updated.id, ok: false, error: updated.summary });
    }
  }

  return NextResponse.json({
    ok: true,
    transcriptSync: transcriptSyncResult,
    expired: expiredCalls.count,
    staleDemoCalls: staleDemoCalls.count,
    cancelledStale: scheduledMaintenance.cancelledStaleCalls,
    processed: results.length,
    results,
  });
}

export async function GET() {
  return processScheduledCalls();
}

export async function POST() {
  return processScheduledCalls();
}
