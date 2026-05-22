import { Prisma, SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureUpcomingScheduledCalls } from "@/lib/calls/scheduling";
import { prisma } from "@/lib/db";
import { supportedBillingCountries, trialLengthDays } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { defaultVoiceId, isAllowedVoiceId } from "@/lib/voice/voice-options";

function splitList(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

const trialSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(8),
  customerCountry: z.enum(supportedBillingCountries),
  parentName: z.string().min(1),
  parentPhone: z.string().min(8),
  timezone: z.string().min(1).optional().default("America/Los_Angeles"),
  preferredCallTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  preferredCallTimes: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional().default([]),
  familyContext: z.string().optional().default(""),
  pets: z.string().optional().default(""),
  hobbies: z.string().optional().default(""),
  routines: z.string().optional().default(""),
  favoriteTopics: z.string().optional().default(""),
  topicsToAvoid: z.string().optional().default(""),
  importantEvents: z.string().optional().default(""),
  questionsToAsk: z.string().optional().default(""),
  preferredTone: z.string().optional().default("warm_patient"),
  preferredVoiceId: z.string().optional().default(defaultVoiceId),
  ritualPreference: z.string().optional().default("morning_chat"),
  plan: z.nativeEnum(SubscriptionPlan),
});

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  if (!token) {
    return NextResponse.json({ ok: false, error: "Please create or log in to your account first." }, { status: 401 });
  }

  const parsed = trialSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid trial signup request." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    return NextResponse.json({ ok: false, error: "Your login session expired. Please log in again." }, { status: 401 });
  }

  const input = parsed.data;
  const authEmail = authData.user.email?.toLowerCase();
  const customerEmail = (authEmail ?? input.customerEmail).toLowerCase();
  const callTimes = (input.preferredCallTimes.length > 0 ? input.preferredCallTimes : input.preferredCallTime ? [input.preferredCallTime] : [])
    .filter(Boolean)
    .slice(0, input.plan === SubscriptionPlan.THREE_CALLS_DAILY ? 3 : 1);

  if (callTimes.length < 1) {
    return NextResponse.json({ ok: false, error: "Choose at least one preferred call time." }, { status: 400 });
  }

  const preferredCallSchedule = callTimes.join(", ");
  const questionsToAsk = input.plan === SubscriptionPlan.THREE_CALLS_DAILY ? input.questionsToAsk : "";
  const preferredVoiceId = isAllowedVoiceId(input.preferredVoiceId) ? input.preferredVoiceId : defaultVoiceId;
  const trialEndsAt = new Date(Date.now() + trialLengthDays * 24 * 60 * 60 * 1000);

  try {
    const { customer, member } = await prisma.$transaction(async (tx) => {
      const existingCustomer = await tx.customer.findFirst({
        where: {
          OR: [{ supabaseUserId: authData.user.id }, { email: customerEmail }],
        },
        select: { id: true },
      });

      const customer = existingCustomer
        ? await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
              fullName: input.customerName,
              email: customerEmail,
              phoneNumber: input.customerPhone,
              supabaseUserId: authData.user.id,
            },
          })
        : await tx.customer.create({
            data: {
              fullName: input.customerName,
              email: customerEmail,
              phoneNumber: input.customerPhone,
              supabaseUserId: authData.user.id,
            },
          });

      const member = await tx.member.create({
        data: {
          customerId: customer.id,
          name: input.parentName,
          phoneNumber: input.parentPhone,
          timezone: input.timezone,
          preferredCallTime: preferredCallSchedule,
          preferredVoiceId,
        },
      });

      await tx.alertContact.create({
        data: {
          customerId: customer.id,
          name: input.customerName,
          phoneNumber: input.customerPhone,
          email: customerEmail,
        },
      });

      await tx.seniorMemory.upsert({
        where: { memberId: member.id },
        create: {
          memberId: member.id,
          preferredName: input.parentName,
          family: input.familyContext ? { notes: input.familyContext } : undefined,
          pets: input.pets ? { notes: input.pets } : undefined,
          hobbies: splitList(input.hobbies),
          routines: splitList(input.routines),
          preferences: {
            favoriteTopics: input.favoriteTopics,
            importantEvents: input.importantEvents,
            preferredTone: input.preferredTone,
            ritualPreference: input.ritualPreference,
          },
          conversationLikes: splitList(input.favoriteTopics),
          conversationAvoids: splitList(input.topicsToAvoid),
          topicsToRevisit: splitList(`${input.importantEvents}\n${questionsToAsk}`),
          recentTopics: splitList(input.favoriteTopics),
          lastSummary: questionsToAsk ? `Family wants DailyCall to ask: ${questionsToAsk}` : null,
        },
        update: {
          preferredName: input.parentName,
          family: input.familyContext ? { notes: input.familyContext } : undefined,
          pets: input.pets ? { notes: input.pets } : undefined,
          hobbies: { set: splitList(input.hobbies) },
          routines: { set: splitList(input.routines) },
          preferences: {
            favoriteTopics: input.favoriteTopics,
            importantEvents: input.importantEvents,
            preferredTone: input.preferredTone,
            ritualPreference: input.ritualPreference,
          },
          conversationLikes: { set: splitList(input.favoriteTopics) },
          conversationAvoids: { set: splitList(input.topicsToAvoid) },
          topicsToRevisit: { set: splitList(`${input.importantEvents}\n${questionsToAsk}`) },
          recentTopics: { set: splitList(input.favoriteTopics) },
          lastSummary: questionsToAsk ? `Family wants DailyCall to ask: ${questionsToAsk}` : null,
        },
      });

      await tx.subscription.create({
        data: {
          customerId: customer.id,
          plan: input.plan,
          status: "TRIALING",
          currentPeriodEndsAt: trialEndsAt,
        },
      });

      return { customer, member };
    });

    await ensureUpcomingScheduledCalls(prisma, [member]);

    return NextResponse.json({ ok: true, dashboardUrl: "/dashboard?trial=started", customerId: customer.id, memberId: member.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "That login is already connected to another DailyCall account. Please log in with that account or contact support." },
        { status: 409 },
      );
    }

    console.error("Trial signup failed", error);
    return NextResponse.json(
      { ok: false, error: "Could not start trial. Please try again, or contact support if it keeps happening." },
      { status: 502 },
    );
  }
}
