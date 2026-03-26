"use client";

import { useMemo, useState } from "react";

import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { LoadingState } from "@/components/loading-state";
import { TopicSearchForm } from "@/components/topic-search-form";
import { AnalysisResult } from "@/lib/types";

const valueProps = [
  {
    title: "See what people really think",
    description:
      "Aggregate high-signal conversations from Reddit, YouTube, and news into one structured view.",
  },
  {
    title: "Discover trends early",
    description:
      "Spot rising and falling narratives before they become obvious in your market.",
  },
  {
    title: "Find ideas instantly",
    description:
      "Get opportunities and contrarian angles for products, content, and positioning in seconds.",
  },
];

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<{
    topic: string;
    premiumAccessToken?: string;
  } | null>(null);

  const preview = useMemo(() => {
    if (analysis) {
      return `${analysis.executiveSummary.headline} (${analysis.totalSignals} signals)`;
    }

    return "Executive summary preview will appear here after your first analysis.";
  }, [analysis]);

  const runAnalysis = async (topic: string, premiumAccessToken?: string) => {
    setIsLoading(true);
    setError(null);
    setLastRequest({ topic, premiumAccessToken });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic, premiumAccessToken }),
      });

      const payload = (await response.json()) as AnalysisResult | { error?: string };
      if (!response.ok) {
        setError((payload as { error?: string }).error ?? "Analysis failed.");
        return;
      }

      setAnalysis(payload as AnalysisResult);
    } catch {
      setError("Network error while requesting analysis. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!lastRequest) {
      return;
    }

    await runAnalysis(lastRequest.topic, lastRequest.premiumAccessToken);
  };

  return (
    <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-16 pt-8 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute left-[-90px] top-[120px] h-64 w-64 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="pointer-events-none absolute right-[-60px] top-[40px] h-52 w-52 rounded-full bg-sky-200/50 blur-3xl" />

      <main className="relative z-10">
        <section className="mx-auto max-w-4xl text-center">
          <p className="mb-4 inline-flex rounded-full border border-amber-300 bg-amber-100 px-4 py-1 text-xs font-semibold tracking-wide text-amber-900">
            AI-powered discourse analysis for builders
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Turn online noise into clear insights
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Search any topic and instantly get key themes, sentiment, trend movement,
            opportunities, and contrarian takes from real online conversations.
          </p>

          <div className="mx-auto mt-8 max-w-3xl">
            <TopicSearchForm onAnalyze={runAnalysis} isLoading={isLoading} />
          </div>
          {error ? (
            <p className="mx-auto mt-4 max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-left text-sm text-rose-700">
              {error}
            </p>
          ) : null}
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {valueProps.map((item) => (
            <article key={item.title} className="glass-panel rounded-3xl p-5">
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          ))}
        </section>

        <section className="glass-panel mt-10 rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-slate-900">Example output preview</h2>
          <p className="mt-3 text-sm text-slate-600">{preview}</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Key themes</p>
              <p className="mt-2 text-sm text-slate-700">
                Product trust gaps, creator-led adoption, and pricing fatigue.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Opportunities</p>
              <p className="mt-2 text-sm text-slate-700">
                Build onboarding clarity tools, niche workflows, and transparent pricing pages.
              </p>
            </div>
          </div>
        </section>

        {isLoading ? <LoadingState /> : null}
        {analysis ? (
          <AnalysisDashboard
            analysis={analysis}
            onRegenerate={handleRegenerate}
            isRegenerating={isLoading}
          />
        ) : null}

        <section className="mt-14 rounded-3xl border border-slate-200 bg-slate-900 px-6 py-10 text-center text-white sm:px-12">
          <h2 className="text-2xl font-semibold">Ready to build from signal, not noise?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-300">
            Start with the free tier and upgrade later with auth + billing when you are ready.
          </p>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="mt-6 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-amber-200"
          >
            Run your first analysis
          </button>
        </section>
      </main>
    </div>
  );
}
