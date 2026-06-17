import { NextResponse } from "next/server";

import { ensureUpcomingScheduledCalls } from "@/lib/calls/scheduling";
import { prisma } from "@/lib/db";
import { withMembersPhotoDisplayUrls } from "@/lib/member-photos";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    return NextResponse.json({ ok: false, error: "Not logged in." }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    return NextResponse.json({ ok: false, error: "Session expired." }, { status: 401 });
  }

  const customer = await prisma.customer.findFirst({
    where: {
      OR: [
        { supabaseUserId: authData.user.id },
        ...(authData.user.email ? [{ email: authData.user.email.toLowerCase() }] : []),
      ],
    },
    include: {
      members: {
        include: {
          memory: true,
          callAttempts: {
            orderBy: { scheduledFor: "desc" },
            take: 90,
          },
        },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      alertContacts: true,
    },
  });

  if (!customer) {
    return NextResponse.json({ ok: true, customer: null });
  }

  if (!customer.supabaseUserId) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { supabaseUserId: authData.user.id },
    });
  }

  await ensureUpcomingScheduledCalls(prisma, customer.members);

  const refreshedMembers = await prisma.member.findMany({
    where: { customerId: customer.id },
    include: {
      memory: true,
      callAttempts: {
        orderBy: { scheduledFor: "desc" },
        take: 90,
      },
    },
  });

  const completedCalls = await prisma.callAttempt.findMany({
    where: {
      member: { customerId: customer.id },
      startedAt: { not: null },
      completedAt: { not: null },
    },
    select: { startedAt: true, completedAt: true },
  });

  const minutesUsed = Math.ceil(
    completedCalls.reduce((total, call) => {
      if (!call.startedAt || !call.completedAt) return total;
      return total + Math.max(0, call.completedAt.getTime() - call.startedAt.getTime()) / 60000;
    }, 0),
  );

  const membersWithPhotoUrls = await withMembersPhotoDisplayUrls(refreshedMembers);

  return NextResponse.json({ ok: true, customer: { ...customer, members: membersWithPhotoUrls, minutesUsed } });
}
