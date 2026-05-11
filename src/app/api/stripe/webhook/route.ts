import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
    case "unpaid":
      return SubscriptionStatus.CANCELED;
    default:
      return SubscriptionStatus.INCOMPLETE;
  }
}

function getSubscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const subscriptionWithPeriod = subscription as Stripe.Subscription & { current_period_end?: number };
  return subscriptionWithPeriod.current_period_end ? new Date(subscriptionWithPeriod.current_period_end * 1000) : null;
}

function getSubscriptionPriceId(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.price.id ?? null;
}

async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription) {
  const localSubscriptionId = subscription.metadata.subscriptionRecordId;
  const customerId = subscription.metadata.customerId;
  const plan = subscription.metadata.plan as SubscriptionPlan | undefined;
  const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const data = {
    status: mapStripeSubscriptionStatus(subscription.status),
    stripeSubscriptionId: subscription.id,
    stripePriceId: getSubscriptionPriceId(subscription),
    currentPeriodEndsAt: getSubscriptionPeriodEnd(subscription),
  };

  if (localSubscriptionId) {
    await prisma.subscription.update({
      where: { id: localSubscriptionId },
      data,
    });
    return;
  }

  const customer = customerId
    ? await prisma.customer.findUnique({ where: { id: customerId } })
    : await prisma.customer.findUnique({ where: { stripeCustomerId } });

  if (!customer || !plan) {
    return;
  }

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: subscription.id },
    update: data,
    create: {
      customerId: customer.id,
      plan,
      ...data,
    },
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (typeof session.subscription !== "string") {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  await upsertSubscriptionFromStripe(subscription);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json({ ok: false, error: "Missing Stripe webhook secret." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ ok: false, error: "Missing Stripe signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Invalid Stripe webhook signature." },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await upsertSubscriptionFromStripe(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
      case "invoice.payment_succeeded":
        break;
      default:
        break;
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Stripe webhook handling failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
