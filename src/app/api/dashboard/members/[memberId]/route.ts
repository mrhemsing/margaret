import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const updateMemberSchema = z.object({
  profile: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      phoneNumber: z.string().trim().min(7).max(30).optional(),
      preferredCallTime: z.string().trim().min(1).max(20).optional(),
    })
    .optional(),
  questionsToAsk: z.array(z.string().trim().min(1).max(300)).max(10).optional(),
});

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
    select: { id: true },
  });

  return customer?.id ?? null;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const customerId = await getAuthenticatedCustomerId(request);

  if (!customerId) {
    return NextResponse.json({ ok: false, error: "Not logged in." }, { status: 401 });
  }

  const { memberId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please check the details and try again." }, { status: 400 });
  }

  const member = await prisma.member.findFirst({
    where: { id: memberId, customerId },
    select: { id: true },
  });

  if (!member) {
    return NextResponse.json({ ok: false, error: "Loved one not found." }, { status: 404 });
  }

  if (parsed.data.profile) {
    await prisma.member.update({
      where: { id: memberId },
      data: parsed.data.profile,
    });
  }

  if (parsed.data.questionsToAsk) {
    await prisma.seniorMemory.upsert({
      where: { memberId },
      create: {
        memberId,
        topicsToRevisit: parsed.data.questionsToAsk,
        lastSummary: parsed.data.questionsToAsk.length > 0 ? "Family custom questions updated from dashboard." : null,
      },
      update: {
        topicsToRevisit: parsed.data.questionsToAsk,
        lastSummary: parsed.data.questionsToAsk.length > 0 ? "Family custom questions updated from dashboard." : null,
      },
    });
  }

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

  return NextResponse.json({ ok: true, member: updatedMember });
}
