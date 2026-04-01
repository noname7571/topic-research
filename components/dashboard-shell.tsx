"use client";

import { useEffect, useMemo, useState } from "react";

import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { LoadingState } from "@/components/loading-state";
import { TopicSearchForm } from "@/components/topic-search-form";
import { AnalysisResult } from "@/lib/types";

interface UsageLog {
  id: number;
  query: string;
  created_at: string;
}

interface AccountResponse {
  user: {
    id: string;
    email: string | null;
  };
  account: {
    plan: "free" | "pro" | "premium";
    usedToday: number;
    dailyLimit: number | null;
    remainingToday: number | null;
    recentSearches: UsageLog[];
    subscription: {
      status: string;
      cancel_at_period_end: boolean;
      current_period_end: string | null;
    } | null;
  };
}

export function DashboardShell() {
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastTopic, setLastTopic] = useState<string | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState<"idle" | "portal" | "cancel">("idle");
  const [feedbackState, setFeedbackState] = useState<
    "idle" | "submitting" | "approved" | "rejected" | "error"
  >("idle");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadAccount = async () => {
    setAccountLoading(true);
    try {
      const response = await fetch("/api/account");
      if (!response.ok) {
        setAccount(null);
        return;
      }

      const payload = (await response.json()) as AccountResponse;
      setAccount(payload);
    } finally {
      setAccountLoading(false);
    }
  };

  useEffect(() => {
    void loadAccount();
  }, []);

  const runAnalysis = async (topic: string) => {
    setIsLoading(true);
    setError(null);
    setFeedbackState("idle");
    setFeedbackMessage(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      const payload = (await response.json()) as AnalysisResult | { error?: string };
      if (!response.ok) {
        setError((payload as { error?: string }).error ?? "Analysis failed.");
        return;
      }

      setAnalysis(payload as AnalysisResult);
      setLastTopic(topic);
      await loadAccount();
    } catch {
      setError("Network error while requesting analysis.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitFeedback = async (approved: boolean) => {
    if (!analysis?.interactionId || feedbackState === "submitting") {
      return;
    }

    setFeedbackState("submitting");
    setFeedbackMessage(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          interactionId: analysis.interactionId,
          approved,
        }),
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setFeedbackState("error");
        setFeedbackMessage(payload.error ?? "Unable to save feedback.");
        return;
      }

      setFeedbackState(approved ? "approved" : "rejected");
      setFeedbackMessage(payload.message ?? "Feedback saved.");
    } catch {
      setFeedbackState("error");
      setFeedbackMessage("Unable to save feedback.");
    }
  };

  const usageLine = useMemo(() => {
    if (!account) {
      return "Connect your account to view plan usage.";
    }

    if (account.account.dailyLimit === null) {
      return `Plan: ${account.account.plan.toUpperCase()} | Unlimited daily searches`;
    }

    return `Plan: ${account.account.plan.toUpperCase()} | ${account.account.remainingToday} of ${account.account.dailyLimit} searches remaining today`;
  }, [account]);

  const openBillingPortal = async () => {
    setBillingLoading("portal");
    setBillingMessage(null);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) {
        setBillingMessage(payload.error ?? "Unable to open billing portal.");
        return;
      }

      window.location.href = payload.url;
    } catch {
      setBillingMessage("Unable to open billing portal.");
    } finally {
      setBillingLoading("idle");
    }
  };

  const cancelAtPeriodEnd = async () => {
    setBillingLoading("cancel");
    setBillingMessage(null);

    try {
      const response = await fetch("/api/stripe/cancel", {
        method: "POST",
      });

      const payload = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        setBillingMessage(payload.error ?? "Unable to schedule cancellation.");
        return;
      }

      setBillingMessage(
        payload.message ??
          "Subscription cancellation scheduled. You will not be billed next month.",
      );
      await loadAccount();
    } catch {
      setBillingMessage("Unable to schedule cancellation.");
    } finally {
      setBillingLoading("idle");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:px-8 lg:px-12">
      <header className="glass-panel rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Discourse Intelligence Engine
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">
          Understand what the internet actually thinks
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{usageLine}</p>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Current Plan</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {account?.account.plan.toUpperCase() ?? "--"}
          </p>
        </article>
        <article className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Searches Used Today</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {account?.account.usedToday ?? 0}
          </p>
        </article>
        <article className="glass-panel rounded-2xl p-5">
          <p className="text-xs uppercase tracking-wide text-slate-500">Upgrade</p>
          {account?.account.plan === "free" ? (
            <a
              href="/pricing"
              className="mt-2 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Unlock full analysis
            </a>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openBillingPortal}
                disabled={billingLoading !== "idle"}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
              >
                {billingLoading === "portal" ? "Opening..." : "Manage billing"}
              </button>
              <button
                type="button"
                onClick={cancelAtPeriodEnd}
                disabled={billingLoading !== "idle" || account?.account.subscription?.cancel_at_period_end}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {account?.account.subscription?.cancel_at_period_end
                  ? "Cancellation scheduled"
                  : billingLoading === "cancel"
                    ? "Scheduling..."
                    : "Cancel plan"}
              </button>
            </div>
          )}
        </article>
      </section>

      {account?.account.subscription?.cancel_at_period_end ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your subscription is set to cancel at period end on{" "}
          {account.account.subscription.current_period_end
            ? new Date(account.account.subscription.current_period_end).toLocaleDateString()
            : "the next billing date"}
          . You will not be billed next month.
        </p>
      ) : null}

      {billingMessage ? (
        <p className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {billingMessage}
        </p>
      ) : null}

      <section className="mt-8">
        <TopicSearchForm onAnalyze={runAnalysis} isLoading={isLoading} />
        {error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
      </section>

      {isLoading ? <LoadingState /> : null}
      {analysis ? (
        <AnalysisDashboard
          analysis={analysis}
          onRegenerate={lastTopic ? () => runAnalysis(lastTopic) : undefined}
          isRegenerating={isLoading}
        />
      ) : null}

      {analysis?.interactionId ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">
            Was this analysis useful?
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Approved analyses are added to your retrieval memory and can improve future runs.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => submitFeedback(true)}
              disabled={feedbackState === "submitting"}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {feedbackState === "submitting" ? "Saving..." : "Approve"}
            </button>
            <button
              type="button"
              onClick={() => submitFeedback(false)}
              disabled={feedbackState === "submitting"}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              Not useful
            </button>
          </div>
          {feedbackMessage ? (
            <p
              className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
                feedbackState === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {feedbackMessage}
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="mt-10 glass-panel rounded-3xl p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-slate-900">Previous searches</h2>
        {accountLoading ? (
          <p className="mt-3 text-sm text-slate-500">Loading search history...</p>
        ) : account?.account.recentSearches.length ? (
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {account.account.recentSearches.map((entry) => (
              <li key={entry.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <span className="font-semibold">{entry.query}</span>
                <span className="ml-2 text-xs text-slate-500">
                  {new Date(entry.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No searches yet. Run your first query above.</p>
        )}
      </section>
    </div>
  );
}
