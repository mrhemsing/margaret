import { SubscriptionPlan } from "@prisma/client";

export const planOptions = [
  {
    label: "1 call/day",
    value: SubscriptionPlan.ONE_CALL_DAILY,
    price: "$34.95",
    envKey: "STRIPE_PRICE_ONE_CALL_DAILY",
  },
  {
    label: "2 calls/day",
    value: SubscriptionPlan.TWO_CALLS_DAILY,
    price: "$64.95",
    envKey: "STRIPE_PRICE_TWO_CALLS_DAILY",
  },
  {
    label: "3 calls/day",
    value: SubscriptionPlan.THREE_CALLS_DAILY,
    price: "$89.95",
    envKey: "STRIPE_PRICE_THREE_CALLS_DAILY",
  },
] as const;

export function getStripePriceIdForPlan(plan: SubscriptionPlan) {
  const option = planOptions.find((candidate) => candidate.value === plan);

  if (!option) {
    throw new Error(`Unsupported subscription plan: ${plan}`);
  }

  const priceId = process.env[option.envKey];

  if (!priceId) {
    throw new Error(`Missing Stripe price ID env var: ${option.envKey}`);
  }

  return priceId;
}
