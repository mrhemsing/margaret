import { SubscriptionPlan } from "@prisma/client";

export type SupportedBillingCountry = "CA" | "US";

export const supportedBillingCountries = ["CA", "US"] as const;

export const planOptions = [
  {
    label: "Wellness",
    value: SubscriptionPlan.ONE_CALL_DAILY,
    price: "$19.95",
    trialMinutes: 90,
    monthlyMinutes: 120,
    detail: "120 included minutes per month for a friendly daily check-in call and access to call transcripts.",
    envKeys: {
      CA: "STRIPE_PRICE_ONE_CALL_DAILY_CAD",
      US: "STRIPE_PRICE_ONE_CALL_DAILY_USD",
    },
  },
  {
    label: "Companion",
    value: SubscriptionPlan.THREE_CALLS_DAILY,
    price: "$34.95",
    trialMinutes: 120,
    monthlyMinutes: 250,
    detail: "250 included minutes per month for richer personalized conversations, call-anytime access, up to 3 preferred daily call windows, and custom questions.",
    envKeys: {
      CA: "STRIPE_PRICE_THREE_CALLS_DAILY_CAD",
      US: "STRIPE_PRICE_THREE_CALLS_DAILY_USD",
    },
  },
] as const;

export const trialLengthDays = 14;

export const additionalMinutePacks = [
  { minutes: 30, price: "$4.99" },
  { minutes: 60, price: "$8.99" },
  { minutes: 120, price: "$14.99" },
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
