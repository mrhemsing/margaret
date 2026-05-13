import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const csvHeaders = [
  "customer_name",
  "customer_email",
  "customer_phone",
  "member_name",
  "member_phone",
  "scheduled_for",
  "started_at",
  "completed_at",
  "status",
  "mood",
  "topics",
  "notable_moments",
  "summary",
  "transcript",
  "provider_conversation_id",
  "provider_call_sid",
];

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";

  const normalized = Array.isArray(value)
    ? value.join("; ")
    : value instanceof Date
      ? value.toISOString()
      : String(value);

  return `"${normalized.replaceAll('"', '""')}"`;
}

export async function GET() {
  try {
    const callAttempts = await prisma.callAttempt.findMany({
      include: {
        member: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: [{ scheduledFor: "desc" }, { createdAt: "desc" }],
    });

    const rows = callAttempts.map((attempt) => [
      attempt.member.customer.fullName,
      attempt.member.customer.email,
      attempt.member.customer.phoneNumber,
      attempt.member.name,
      attempt.member.phoneNumber,
      attempt.scheduledFor,
      attempt.startedAt,
      attempt.completedAt,
      attempt.status,
      attempt.mood,
      attempt.topics,
      attempt.notableMoments,
      attempt.summary,
      attempt.transcript,
      attempt.providerConversationId,
      attempt.providerCallSid,
    ]);

    const csv = [csvHeaders, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    const exportedAt = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dailycall-transcripts-${exportedAt}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not export transcripts." },
      { status: 500 },
    );
  }
}
