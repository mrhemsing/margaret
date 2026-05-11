import { SubscriptionPlan } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { getStripePriceIdForPlan } from "@/lib/plans";
import { stripe } from "@/lib/stripe";

function splitList(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

const checkoutSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(8),
  parentName: z.string().min(1),
  parentPhone: z.string().min(8),
  preferredCallTime: z.string().regex(/^\d{2}:\d{2}$/),
  familyContext: z.string().optional().default(""),
  pets: z.string().optional().default(""),
  hobbies: z.string().optional().default(""),
  routines: z.string().optional().default(""),
  favoriteTopics: z.string().optional().default(""),
  topicsToAvoid: z.string().optional().default(""),
  importantEvents: z.string().optional().default(""),
  questionsToAsk: z.string().optional().default(""),
  preferredTone: z.string().optional().default("warm_patient"),
  ritualPreference: z.string().optional().default("morning_chat"),
  plan: z.nativeEnum(SubscriptionPlan),
});

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid checkout request." }, { status: 400 });
  }

  const input = parsed.data;
  const priceId = getStripePriceIdForPlan(input.plan);
  const appUrl = process.env.APP_URL ?? "http://localhost:3003";

  try {
    const stripeCustomer = await stripe.customers.create({
      name: input.customerName,
      email: input.customerEmail,
      phone: input.customerPhone,
      metadata: {
        source: "dailycall_signup",
      },
    });

    const { customer, member, subscription } = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { email: input.customerEmail },
        update: {
          fullName: input.customerName,
          phoneNumber: input.customerPhone,
          stripeCustomerId: stripeCustomer.id,
        },
        create: {
          fullName: input.customerName,
          email: input.customerEmail,
          phoneNumber: input.customerPhone,
          stripeCustomerId: stripeCustomer.id,
        },
      });

      const member = await tx.member.create({
        data: {
          customerId: customer.id,
          name: input.parentName,
          phoneNumber: input.parentPhone,
          preferredCallTime: input.preferredCallTime,
        },
      });

      await tx.alertContact.create({
        data: {
          customerId: customer.id,
          name: input.customerName,
          phoneNumber: input.customerPhone,
          email: input.customerEmail,
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
          topicsToRevisit: splitList(`${input.importantEvents}\n${input.questionsToAsk}`),
          recentTopics: splitList(input.favoriteTopics),
          lastSummary: input.questionsToAsk ? `Family wants Dailycall to ask: ${input.questionsToAsk}` : null,
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
          topicsToRevisit: { set: splitList(`${input.importantEvents}\n${input.questionsToAsk}`) },
          recentTopics: { set: splitList(input.favoriteTopics) },
          lastSummary: input.questionsToAsk ? `Family wants Dailycall to ask: ${input.questionsToAsk}` : null,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          customerId: customer.id,
          plan: input.plan,
          stripePriceId: priceId,
        },
      });

      return { customer, member, subscription };
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?checkout=success`,
      cancel_url: `${appUrl}/signup?checkout=cancelled`,
      customer_update: {
        address: "auto",
        name: "auto",
      },
      metadata: {
        customerId: customer.id,
        memberId: member.id,
        subscriptionRecordId: subscription.id,
        plan: input.plan,
      },
      subscription_data: {
        metadata: {
          customerId: customer.id,
          memberId: member.id,
          subscriptionRecordId: subscription.id,
          plan: input.plan,
        },
      },
    });

    return NextResponse.json({ ok: true, checkoutUrl: session.url });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Checkout failed." },
      { status: 502 },
    );
  }
}
