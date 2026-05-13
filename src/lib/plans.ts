import { SubscriptionPlan } from "@prisma/client";

export type SupportedBillingCountry = "CA" | "US";

export const supportedBillingCountries = ["CA", "US"] as const;

export const planOptions = [
  {
    label: "Companion Daily",
    value: SubscriptionPlan.ONE_CALL_DAILY,
    price: "$14.95",
    detail: "1 caring call per day, missed-call alert after 2 unanswered attempts, 1 family alert contact, and call transcripts.",
    envKeys: {
      CA: "STRIPE_PRICE_ONE_CALL_DAILY_CAD",
      US: "STRIPE_PRICE_ONE_CALL_DAILY_USD",
    },
  },
  {
    label: "Companion Plus",
    value: SubscriptionPlan.THREE_CALLS_DAILY,
    price: "$29.95",
    detail: "Up to 3 caring calls per day, up to 10 alert contacts, custom questions, unlimited conversation time, and expanded summaries.",
    envKeys: {
      CA: "STRIPE_PRICE_THREE_CALLS_DAILY_CAD",
      US: "STRIPE_PRICE_THREE_CALLS_DAILY_USD",
    },
  },
] as const;

const legacyPlanEnvKeys: Partial<Record<SubscriptionPlan, string>> = {
  [SubscriptionPlan.TWO_CALLS_DAILY]: "STRIPE_PRICE_TWO_CALLS_DAILY",
};

function getCountrySpecificEnvKey(plan: SubscriptionPlan, country: SupportedBillingCountry) {
  const option = planOptions.find((candidate) => candidate.value === plan);
  return option?.envKeys[country] ?? legacyPlanEnvKeys[plan];
}

export function getStripePriceIdForPlan(plan: SubscriptionPlan, country: SupportedBillingCountry) {
  const envKey = getCountrySpecificEnvKey(plan, country);

  if (!envKey) {
    throw new Error(`Unsupported subscription plan: ${plan}`);
  }

  const priceId = process.env[envKey];

  if (!priceId) {
    throw new Error(`Missing Stripe price ID env var: ${envKey}`);
  }

  return priceId;
}
