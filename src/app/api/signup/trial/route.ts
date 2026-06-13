import { Prisma, SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureUpcomingScheduledCalls } from "@/lib/calls/scheduling";
import { prisma } from "@/lib/db";
import { planOptions, supportedBillingCountries, trialLengthDays } from "@/lib/plans";
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
  accountPassword: z.string().min(8).optional(),
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPlan(plan: SubscriptionPlan) {
  return planOptions.find((option) => option.value === plan)?.label ?? plan;
}

async function sendSignupAlertEmail(input: {
  customerId: string;
  memberId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCountry: string;
  parentName: string;
  parentPhone: string;
  timezone: string;
  preferredCallSchedule: string;
  plan: SubscriptionPlan;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const signupAlertToEmail = process.env.SIGNUP_ALERT_TO_EMAIL ?? "contact@dailycall.care";
  const signupAlertFromEmail = process.env.SIGNUP_ALERT_FROM_EMAIL ?? process.env.SUPPORT_FROM_EMAIL ?? "DailyCall <support@dailycall.care>";
  const submittedAt = new Date().toISOString();
  const planLabel = formatPlan(input.plan);

  if (!resendApiKey) {
    console.info("Trial signup email alert skipped; RESEND_API_KEY is not configured", {
      submittedAt,
      customerId: input.customerId,
      memberId: input.memberId,
      customerEmail: input.customerEmail,
      parentName: input.parentName,
      plan: input.plan,
    });
    return;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: signupAlertFromEmail,
        to: [signupAlertToEmail],
        reply_to: input.customerEmail,
        subject: `New DailyCall signup: ${input.customerName}`,
        html: `
          <h2>New DailyCall trial signup</h2>
          <p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>
          <p><strong>Plan:</strong> ${escapeHtml(planLabel)}</p>
          <p><strong>Customer:</strong> ${escapeHtml(input.customerName)}</p>
          <p><strong>Customer email:</strong> ${escapeHtml(input.customerEmail)}</p>
          <p><strong>Customer phone:</strong> ${escapeHtml(input.customerPhone)}</p>
          <p><strong>Billing country:</strong> ${escapeHtml(input.customerCountry)}</p>
          <p><strong>Member:</strong> ${escapeHtml(input.parentName)}</p>
          <p><strong>Member phone:</strong> ${escapeHtml(input.parentPhone)}</p>
          <p><strong>Timezone:</strong> ${escapeHtml(input.timezone)}</p>
          <p><strong>Call schedule:</strong> ${escapeHtml(input.preferredCallSchedule)}</p>
          <p><strong>Customer ID:</strong> ${escapeHtml(input.customerId)}</p>
          <p><strong>Member ID:</strong> ${escapeHtml(input.memberId)}</p>
        `,
        text: [
          "New DailyCall trial signup",
          "",
          `Submitted: ${submittedAt}`,
          `Plan: ${planLabel}`,
          `Customer: ${input.customerName}`,
          `Customer email: ${input.customerEmail}`,
          `Customer phone: ${input.customerPhone}`,
          `Billing country: ${input.customerCountry}`,
          `Member: ${input.parentName}`,
          `Member phone: ${input.parentPhone}`,
          `Timezone: ${input.timezone}`,
          `Call schedule: ${input.preferredCallSchedule}`,
          `Customer ID: ${input.customerId}`,
          `Member ID: ${input.memberId}`,
        ].join("\n"),
      }),
    });

    if (!response.ok) {
      console.error("Trial signup email alert failed", { status: response.status, submittedAt, customerId: input.customerId, memberId: input.memberId });
    }
  } catch (error) {
    console.error("Trial signup email alert error", error);
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;

  const parsed = trialSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid trial signup request." }, { status: 400 });
  }

  const input = parsed.data;
  const supabase = createSupabaseAdminClient();
  let authUserId: string;
  let authEmail: string | undefined;

  if (token) {
    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authData.user) {
      return NextResponse.json({ ok: false, error: "Your login session expired. Please log in again." }, { status: 401 });
    }

    authUserId = authData.user.id;
    authEmail = authData.user.email?.toLowerCase();
  } else {
    if (!input.accountPassword) {
      return NextResponse.json({ ok: false, error: "Create a password or log in before starting the trial." }, { status: 401 });
    }

    const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: input.customerEmail.toLowerCase(),
      password: input.accountPassword,
      email_confirm: true,
      user_metadata: { full_name: input.customerName },
    });

    if (createUserError || !createdUser.user) {
      return NextResponse.json(
        { ok: false, error: "That email may already have an account. Please log in, then finish starting the trial." },
        { status: 409 },
      );
    }

    authUserId = createdUser.user.id;
    authEmail = createdUser.user.email?.toLowerCase();
  }

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
          OR: [{ supabaseUserId: authUserId }, { email: customerEmail }],
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
              supabaseUserId: authUserId,
            },
          })
        : await tx.customer.create({
            data: {
              fullName: input.customerName,
              email: customerEmail,
              phoneNumber: input.customerPhone,
              supabaseUserId: authUserId,
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
    await sendSignupAlertEmail({
      customerId: customer.id,
      memberId: member.id,
      customerName: input.customerName,
      customerEmail,
      customerPhone: input.customerPhone,
      customerCountry: input.customerCountry,
      parentName: input.parentName,
      parentPhone: input.parentPhone,
      timezone: input.timezone,
      preferredCallSchedule,
      plan: input.plan,
    });

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
