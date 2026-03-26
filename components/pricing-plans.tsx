"use client";

import { useState } from "react";

const planCards = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    subtitle: "basic signal preview",
    features: [
      "3-4 executive bullets",
      "2-3 key themes",
      "5 searches/day",
      "Locked deep intelligence sections",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29/mo",
    subtitle: "full intelligence access",
    features: [
      "Full themes + explanations",
      "Opportunities + contrarian insights",
      "Content engine outputs",
      "Higher daily limits",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: "$79/mo",
    subtitle: "power user / unlimited",
    features: [
      "Everything in Pro",
      "Highest evidence depth",
      "Priority signal volume",
      "Unlimited daily searches",
    ],
  },
] as const;

export function PricingPlans() {
  const [loadingPlan, setLoadingPlan] = useState<"pro" | "premium" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkout = async (plan: "pro" | "premium") => {
    setError(null);
    setLoadingPlan(plan);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Unable to start checkout.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      setError("Unable to contact billing service.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {planCards.map((plan) => (
          <article
            key={plan.id}
            className={`rounded-3xl border p-6 shadow-sm ${
              plan.id === "pro"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-900"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">
              {plan.subtitle}
            </p>
            <h2 className="mt-2 text-2xl font-bold">{plan.name}</h2>
            <p className="mt-2 text-3xl font-extrabold">{plan.price}</p>
            <ul className="mt-4 space-y-2 text-sm leading-6">
              {plan.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>

            {plan.id === "free" ? (
              <a
                href="/signup"
                className="mt-6 inline-flex rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Start free
              </a>
            ) : (
              <button
                type="button"
                onClick={() => checkout(plan.id)}
                disabled={loadingPlan === plan.id}
                className={`mt-6 inline-flex rounded-xl px-4 py-2 text-sm font-semibold ${
                  plan.id === "pro"
                    ? "bg-white text-slate-900"
                    : "bg-slate-900 text-white"
                } disabled:opacity-60`}
              >
                {loadingPlan === plan.id ? "Redirecting..." : `Choose ${plan.name}`}
              </button>
            )}
          </article>
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </>
  );
}
