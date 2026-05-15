import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startAmdProtectedCheckInCall } from "@/lib/voice/twilio";
import { ensureUpcomingScheduledCalls } from "@/lib/calls/scheduling";

const PROCESSING_WINDOW_MS = 30 * 60 * 1000;

export async function POST() {
  const now = new Date();
  const processingWindowStart = new Date(now.getTime() - PROCESSING_WINDOW_MS);
  const activeMembers = await prisma.member.findMany({
    where: { active: true },
    select: { id: true, active: true, preferredCallTime: true, timezone: true },
  });

  await ensureUpcomingScheduledCalls(prisma, activeMembers);

  const expiredCalls = await prisma.callAttempt.updateMany({
    where: {
      status: "SCHEDULED",
      scheduledFor: { lt: processingWindowStart },
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
      scheduledFor: {
        gte: processingWindowStart,
        lte: now,
      },
    },
    include: { member: true },
    orderBy: { scheduledFor: "asc" },
    take: 10,
  });

  const results = [];

  for (const call of dueCalls) {
    try {
      const result = await startAmdProtectedCheckInCall({
        toNumber: call.member.phoneNumber,
        memberName: call.member.name,
        caregiverName: "DailyCall team",
      });

      const updated = await prisma.callAttempt.update({
        where: { id: call.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
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

  return NextResponse.json({ ok: true, expired: expiredCalls.count, processed: results.length, results });
}
