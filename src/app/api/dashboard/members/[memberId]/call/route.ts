import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { refreshMemberWeatherBriefing } from "@/lib/voice/current-info";
import { startAmdProtectedCheckInCall } from "@/lib/voice/twilio";

const USER_SAFE_CALL_CONNECTION_ERROR = "The call was answered but could not be connected successfully.";

async function getAuthenticatedCustomerId(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) return null;

  const supabase = createSupabaseAdminClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) return null;

  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { supabaseUserId: authData.user.id },
        ...(authData.user.email ? [{ email: authData.user.email.toLowerCase() }] : []),
      ],
    },
    select: { id: true, fullName: true },
  });

  return customer ?? null;
}

export async function POST(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const customer = await getAuthenticatedCustomerId(request);

  if (!customer) {
    return NextResponse.json({ ok: false, error: "Not logged in." }, { status: 401 });
  }

  const { memberId } = await params;
  const member = await prisma.member.findFirst({
    where: { id: memberId, customerId: customer.id },
    include: {
      memory: true,
      callAttempts: {
        orderBy: { scheduledFor: "desc" },
        take: 20,
      },
    },
  });

  if (!member) {
    return NextResponse.json({ ok: false, error: "Loved one not found." }, { status: 404 });
  }

  if (!member.active) {
    return NextResponse.json({ ok: false, error: "This loved one is paused. Reactivate them before starting a call." }, { status: 409 });
  }

  if (member.callPausedUntil && member.callPausedUntil.getTime() > Date.now()) {
    return NextResponse.json({ ok: false, error: "Daily calls are paused until the selected resume date." }, { status: 409 });
  }

  const recentInProgressCall = await prisma.callAttempt.findFirst({
    where: {
      status: "IN_PROGRESS",
      AND: [
        {
          OR: [
            { memberId: member.id },
            { member: { phoneNumber: member.phoneNumber } },
          ],
        },
        {
          OR: [
            { providerConversationId: { not: null }, createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
            { providerConversationId: null, createdAt: { gte: new Date(Date.now() - 4 * 60 * 1000) } },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (recentInProgressCall) {
    return NextResponse.json({ ok: false, error: "A call is already in progress for this loved one." }, { status: 409 });
  }

  let callAttemptId: string | null = null;

  try {
    const now = new Date();
    const pendingRetryWindowEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    await prisma.callAttempt.updateMany({
      where: {
        memberId: member.id,
        status: "SCHEDULED",
        scheduledFor: {
          gte: now,
          lte: pendingRetryWindowEnd,
        },
        OR: [
          { retryAttempt: { gt: 0 } },
          { retryOfCallAttemptId: { not: null } },
        ],
      },
      data: {
        status: "FAILED",
        completedAt: now,
        summary: "Canceled pending retry because a manual dashboard call was started.",
        syncedAt: now,
      },
    });

    const callAttempt = await prisma.callAttempt.create({
      data: {
        memberId: member.id,
        scheduledFor: now,
        startedAt: now,
        status: "IN_PROGRESS",
        summary: `Manual dashboard call is being placed for ${member.name}.`,
      },
    });
    callAttemptId = callAttempt.id;

    await refreshMemberWeatherBriefing(prisma, member);

    const result = await startAmdProtectedCheckInCall({
      toNumber: member.phoneNumber,
      callAttemptId: callAttempt.id,
      memberName: member.name,
      caregiverName: customer.fullName || "your family",
    });

    await prisma.callAttempt.update({
      where: { id: callAttempt.id },
      data: {
        providerCallSid: result.sid ?? null,
        summary: `Manual dashboard call started for ${member.name}.`,
        syncedAt: new Date(),
      },
    });

    const updatedMember = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        memory: true,
        callAttempts: {
          orderBy: { scheduledFor: "desc" },
          take: 20,
        },
      },
    });

    return NextResponse.json({ ok: true, member: updatedMember, callSid: result.sid ?? null });
  } catch (error) {
    if (callAttemptId) {
      await prisma.callAttempt.update({
        where: { id: callAttemptId },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          summary: error instanceof Error ? error.message : USER_SAFE_CALL_CONNECTION_ERROR,
          syncedAt: new Date(),
        },
      });
    }
    console.error("Dashboard manual call failed", error);
    return NextResponse.json(
      { ok: false, error: USER_SAFE_CALL_CONNECTION_ERROR },
      { status: 502 },
    );
  }
}
