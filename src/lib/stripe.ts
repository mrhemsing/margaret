import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeClient() {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  stripeClient ??= new Stripe(stripeSecretKey, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });

  return stripeClient;
}

export const stripePriceIds = {
  oneCallDaily: process.env.STRIPE_PRICE_ONE_CALL_DAILY,
  twoCallsDaily: process.env.STRIPE_PRICE_TWO_CALLS_DAILY,
  threeCallsDaily: process.env.STRIPE_PRICE_THREE_CALLS_DAILY,
};
