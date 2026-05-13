import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
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
            take: 5,
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

  return NextResponse.json({ ok: true, customer });
}
