"use client";

import { useState } from "react";

type LegalTab = "terms" | "privacy";

const tabStyle: Record<LegalTab, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
};

const termsItems = [
  {
    title: "Acceptance",
    text: "By using Discourse IQ, you agree to these Terms and applicable laws. If you do not agree, do not use the service.",
  },
  {
    title: "Service Scope",
    text: "Discourse IQ provides AI-assisted discourse intelligence. Insights are informational and should not be treated as legal, financial, or medical advice.",
  },
  {
    title: "Accounts",
    text: "You are responsible for account security and all actions under your account. Provide accurate information and keep credentials private.",
  },
  {
    title: "Plans and Billing",
    text: "Paid plans are billed monthly. If you cancel, your plan remains active through the current billing period and does not renew next cycle.",
  },
  {
    title: "Acceptable Use",
    text: "Do not misuse the service, attempt unauthorized access, or upload illegal or infringing content. We may suspend abusive accounts.",
  },
  {
    title: "Intellectual Property",
    text: "The platform, UI, and software are owned by Discourse IQ. You retain rights to your original inputs as permitted by law.",
  },
  {
    title: "Limitation of Liability",
    text: "The service is provided as-is. To the extent permitted by law, Discourse IQ is not liable for indirect or consequential damages.",
  },
];

const privacyItems = [
  {
    title: "Data We Collect",
    text: "We collect account details (email, plan), usage logs (queries and timestamps), and subscription metadata required for billing and service operation.",
  },
  {
    title: "How We Use Data",
    text: "We use data to authenticate users, enforce plan limits, process billing, improve product quality, and detect abuse.",
  },
  {
    title: "Third-Party Processors",
    text: "We use Supabase for authentication/database and Stripe for billing. Their processing is governed by their own terms and privacy policies.",
  },
  {
    title: "Retention",
    text: "We retain account and billing records as needed for service delivery, legal obligations, and fraud prevention. You can request deletion where applicable.",
  },
  {
    title: "Security",
    text: "We apply reasonable technical and organizational measures to protect data, but no system can guarantee absolute security.",
  },
  {
    title: "Your Rights",
    text: "Depending on your jurisdiction, you may have rights to access, correct, export, or delete personal data. Contact support to submit requests.",
  },
  {
    title: "Contact",
    text: "For legal or privacy requests, contact support through your account channel. Include enough detail for us to verify and process your request.",
  },
];

export function LegalView() {
  const [activeTab, setActiveTab] = useState<LegalTab>(() => {
    if (typeof window === "undefined") {
      return "terms";
    }

    const view = new URLSearchParams(window.location.search).get("view");
    return view === "privacy" ? "privacy" : "terms";
  });

  const items = activeTab === "terms" ? termsItems : privacyItems;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:px-8 lg:px-12">
      <section className="glass-panel rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Legal
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Terms and Privacy
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
          Clear rules and data practices for using Discourse IQ. This page is designed for fast scanning,
          practical clarity, and transparent billing/privacy expectations.
        </p>

        <div className="mt-6 inline-flex rounded-2xl border border-slate-200 bg-white p-1">
          {(Object.keys(tabStyle) as LegalTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tabStyle[tab]}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-4">
        {items.map((item) => (
          <article key={item.title} className="glass-panel rounded-2xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-700 sm:text-base">{item.text}</p>
          </article>
        ))}
      </section>

      <p className="mt-6 text-xs text-slate-500">Last updated: April 1, 2026</p>
    </div>
  );
}
