import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { ensureUpcomingScheduledCalls } from "@/lib/calls/scheduling";
import { withMemberPhotoDisplayUrl } from "@/lib/member-photos";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAllowedVoiceId, maxMemberSpeechSpeed, minMemberSpeechSpeed, normalizeVoiceMode } from "@/lib/voice/voice-options";

const updateMemberSchema = z.object({
  profile: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      phoneNumber: z.string().trim().min(7).max(30).optional(),
      weatherLocation: z.string().trim().min(2).max(120).nullable().optional(),
      preferredCallTime: z.string().trim().min(1).max(20).optional(),
      preferredVoiceId: z.string().trim().optional().refine((value) => !value || isAllowedVoiceId(value), "Voice not available."),
      voiceMode: z.enum(["expressive", "clear"]).optional(),
      speechSpeed: z.number().min(minMemberSpeechSpeed).max(maxMemberSpeechSpeed).nullable().optional(),
    })
    .optional(),
  callStatus: z
    .object({
      mode: z.enum(["active", "pause_until", "pause_indefinitely"]),
      pauseUntil: z.string().trim().optional(),
    })
    .optional(),
  retrySettings: z
    .object({
      voicemailRetryCount: z.number().int().min(0).max(3).optional(),
      voicemailRetryDelayMins: z.number().int().min(5).max(120).optional(),
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
    const profile = parsed.data.profile;
    await prisma.member.update({
      where: { id: memberId },
      data: {
        ...profile,
        ...(profile.voiceMode ? { voiceMode: normalizeVoiceMode(profile.voiceMode) } : {}),
      },
    });

    if (parsed.data.profile.preferredCallTime) {
      const scheduledMember = await prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, active: true, callPausedUntil: true, preferredCallTime: true, timezone: true },
      });

      if (scheduledMember) {
        await ensureUpcomingScheduledCalls(prisma, [scheduledMember]);
      }
    }
  }

  if (parsed.data.callStatus) {
    const { mode, pauseUntil } = parsed.data.callStatus;
    let callPausedUntil: Date | null = null;

    if (mode === "pause_until") {
      if (!pauseUntil) {
        return NextResponse.json({ ok: false, error: "Choose when calls should resume." }, { status: 400 });
      }

      callPausedUntil = new Date(`${pauseUntil}T23:59:59.999`);

      if (!Number.isFinite(callPausedUntil.getTime()) || callPausedUntil.getTime() <= Date.now()) {
        return NextResponse.json({ ok: false, error: "Choose a future resume date." }, { status: 400 });
      }
    }

    const scheduledMember = await prisma.member.update({
      where: { id: memberId },
      data: {
        active: mode !== "pause_indefinitely",
        callPausedUntil: mode === "pause_until" ? callPausedUntil : null,
      },
      select: { id: true, active: true, callPausedUntil: true, preferredCallTime: true, timezone: true },
    });

    await ensureUpcomingScheduledCalls(prisma, [scheduledMember]);
  }

  if (parsed.data.retrySettings) {
    await prisma.member.update({
      where: { id: memberId },
      data: parsed.data.retrySettings,
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
        take: 90,
      },
    },
  });

  return NextResponse.json({ ok: true, member: updatedMember ? await withMemberPhotoDisplayUrl(updatedMember) : updatedMember });
}
