import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { APP_CONFIG } from "@/lib/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

const resolvePlanFromPrice = (priceId: string | undefined): "free" | "pro" | "premium" => {
  if (!priceId) {
    return "free";
  }

  if (priceId === APP_CONFIG.stripePremiumPriceId) {
    return "premium";
  }

  if (priceId === APP_CONFIG.stripeProPriceId) {
    return "pro";
  }

  return "free";
};

const upsertSubscription = async (params: {
  userId: string;
  customerId: string | null;
  subscriptionId: string | null;
  status: string;
  plan: "free" | "pro" | "premium";
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
}) => {
  const admin = createSupabaseAdminClient();

  await admin.from("subscriptions").upsert(
    {
      user_id: params.userId,
      stripe_customer_id: params.customerId,
      stripe_subscription_id: params.subscriptionId,
      status: params.status,
      cancel_at_period_end: params.cancelAtPeriodEnd,
      current_period_end: params.currentPeriodEnd,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    },
  );

  await admin
    .from("users")
    .update({
      plan: params.plan,
    })
    .eq("id", params.userId);
};

const updateBySubscriptionId = async (subscription: Stripe.Subscription) => {
  const admin = createSupabaseAdminClient();
  const { data: row } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle<{ user_id: string }>();

  if (!row?.user_id) {
    return;
  }

  const active = subscription.status === "active" || subscription.status === "trialing";
  const currentPriceId = subscription.items.data[0]?.price?.id;
  const nextPlan = active ? resolvePlanFromPrice(currentPriceId) : "free";

  await upsertSubscription({
    userId: row.user_id,
    customerId: (subscription.customer as string | null) ?? null,
    subscriptionId: subscription.id,
    status: subscription.status,
    plan: nextPlan,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: subscription.items.data[0]?.current_period_end
      ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
      : null,
  });
};

export async function POST(request: Request) {
  try {
    if (!APP_CONFIG.stripeWebhookSecret) {
      return NextResponse.json(
        { error: "Stripe webhook secret is not configured." },
        { status: 500 },
      );
    }

    const body = await request.text();
    const headerStore = await headers();
    const signature = headerStore.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing stripe signature." }, { status: 400 });
    }

    const stripe = getStripeClient();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      APP_CONFIG.stripeWebhookSecret,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const planFromMetadata = session.metadata?.plan;
      const userId = session.metadata?.userId;
      const stripeSubscriptionId = (session.subscription as string | null) ?? null;

      let cancelAtPeriodEnd = false;
      let currentPeriodEnd: string | null = null;
      if (stripeSubscriptionId) {
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
        currentPeriodEnd = stripeSubscription.items.data[0]?.current_period_end
          ? new Date(stripeSubscription.items.data[0].current_period_end * 1000).toISOString()
          : null;
      }

      if (userId && (planFromMetadata === "pro" || planFromMetadata === "premium")) {
        await upsertSubscription({
          userId,
          customerId: (session.customer as string | null) ?? null,
          subscriptionId: stripeSubscriptionId,
          status: "active",
          plan: planFromMetadata,
          cancelAtPeriodEnd,
          currentPeriodEnd,
        });
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await updateBySubscriptionId(event.data.object as Stripe.Subscription);
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook handling failed." }, { status: 400 });
  }
}
