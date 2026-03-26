import Stripe from "stripe";

import { APP_CONFIG } from "@/lib/config";

let stripeClient: Stripe | null = null;

export const getStripeClient = (): Stripe => {
  if (!APP_CONFIG.stripeSecretKey) {
    throw new Error("Stripe secret key is not configured.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(APP_CONFIG.stripeSecretKey);
  }

  return stripeClient;
};
