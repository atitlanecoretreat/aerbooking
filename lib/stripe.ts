import Stripe from "stripe";

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing required environment variable: STRIPE_SECRET_KEY");
  }

  return new Stripe(secretKey);
}
