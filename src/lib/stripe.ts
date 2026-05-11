import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

export const stripePriceIds = {
  oneCallDaily: process.env.STRIPE_PRICE_ONE_CALL_DAILY,
  twoCallsDaily: process.env.STRIPE_PRICE_TWO_CALLS_DAILY,
  threeCallsDaily: process.env.STRIPE_PRICE_THREE_CALLS_DAILY,
};
