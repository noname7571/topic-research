import { NextResponse } from "next/server";

import { APP_CONFIG } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

interface CheckoutRequest {
  plan?: "pro" | "premium";
}

const getPriceIdForPlan = (plan: "pro" | "premium"): string => {
  return plan === "pro" ? APP_CONFIG.stripeProPriceId : APP_CONFIG.stripePremiumPriceId;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CheckoutRequest;
    const plan = payload.plan;

    if (plan !== "pro" && plan !== "premium") {
      return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    }

    const priceId = getPriceIdForPlan(plan);
    if (!priceId) {
      return NextResponse.json(
        { error: "Stripe price ID is not configured for this plan." },
        { status: 500 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = getStripeClient();
    const price = await stripe.prices.retrieve(priceId);

    if (
      !price.recurring ||
      price.recurring.interval !== "month" ||
      !price.active
    ) {
      return NextResponse.json(
        {
          error:
            "Selected plan is not configured as an active monthly subscription in Stripe.",
        },
        { status: 400 },
      );
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: subscription?.stripe_customer_id ?? undefined,
      customer_email: subscription?.stripe_customer_id ? undefined : user.email ?? undefined,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${APP_CONFIG.appUrl}/dashboard?checkout=success`,
      cancel_url: `${APP_CONFIG.appUrl}/pricing?checkout=cancelled`,
      metadata: {
        userId: user.id,
        plan,
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json(
      { error: "Unable to start checkout session." },
      { status: 500 },
    );
  }
}
