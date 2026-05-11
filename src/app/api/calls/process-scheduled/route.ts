import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startAmdProtectedCheckInCall } from "@/lib/voice/twilio";

export async function POST() {
  const dueCalls = await prisma.callAttempt.findMany({
    where: {
      status: "SCHEDULED",
      scheduledFor: { lte: new Date() },
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
        caregiverName: "Dailycall team",
      });

      const updated = await prisma.callAttempt.update({
        where: { id: call.id },
        data: {
          status: "IN_PROGRESS",
          startedAt: new Date(),
          providerCallSid: result.sid ?? null,
          summary: `Retry ${call.retryAttempt} started after voicemail detection.`,
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

  return NextResponse.json({ ok: true, processed: results.length, results });
}
