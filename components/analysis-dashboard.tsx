"use client";

import { useMemo, useState } from "react";

import { OpportunityCard } from "@/components/intelligence/opportunity-card";
import { InsightCard } from "@/components/intelligence/insight-card";
import { ThemeCard } from "@/components/intelligence/theme-card";
import { AnalysisResult, SourcePreview } from "@/lib/types";

interface AnalysisDashboardProps {
  analysis: AnalysisResult;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}

const trendTone = {
  rising: "border-emerald-200 bg-emerald-50 text-emerald-700",
  stable: "border-blue-200 bg-blue-50 text-blue-700",
  falling: "border-amber-200 bg-amber-50 text-amber-700",
};

const sanitizeSourceText = (value: string): string => {
  return value
    .replace(/#[^\s]+/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getTrendDirection = (analysis: AnalysisResult): keyof typeof trendTone => {
  return analysis.trends[0]?.direction ?? "stable";
};

const buildCopyPayload = (analysis: AnalysisResult): string => {
  const topThemes = analysis.keyThemes
    .slice(0, 5)
    .map((theme) => `- ${theme.name}: ${theme.whatPeopleAreSaying ?? theme.summary}`)
    .join("\n");

  const opportunities = analysis.opportunities
    .slice(0, 4)
    .map((item) => `- ${item.title}: ${item.rationale}`)
    .join("\n");

  const contrarian = analysis.contrarianInsights
    .slice(0, 3)
    .map((item) => `- ${item.title}: ${item.rationale}`)
    .join("\n");

  return [
    `Topic: ${analysis.topic}`,
    "",
    `Summary: ${analysis.executiveSummary.summary}`,
    "",
    "Executive bullets:",
    ...analysis.executiveSummary.bullets.slice(0, 6).map((bullet) => `- ${bullet}`),
    "",
    "Themes:",
    topThemes,
    "",
    "Opportunities:",
    opportunities,
    "",
    "Contrarian insights:",
    contrarian,
  ].join("\n");
};

export function AnalysisDashboard({
  analysis,
  onRegenerate,
  isRegenerating = false,
}: AnalysisDashboardProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const [shareState, setShareState] = useState<"idle" | "shared">("idle");
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const executiveBullets = analysis.executiveSummary.bullets ?? [];

  const trendDirection = getTrendDirection(analysis);
  const topTrend = analysis.trends[0];

  const defaultVisibleCount =
    analysis.sourceAccess?.defaultVisibleCount ?? Math.min(5, analysis.sampleSources.length);

  const visibleSources = useMemo(() => {
    const cleaned = analysis.sampleSources
      .map((source) => ({
        ...source,
        title: sanitizeSourceText(source.title),
      }))
      .filter((source) => source.title.length > 8);

    if (showAllEvidence) {
      return cleaned;
    }

    return cleaned.slice(0, defaultVisibleCount);
  }, [analysis.sampleSources, defaultVisibleCount, showAllEvidence]);

  const totalSources = analysis.sourceAccess?.totalCount ?? analysis.sampleSources.length;
  const hiddenSourceCount = Math.max(0, totalSources - defaultVisibleCount);

  const riskLine =
    analysis.contrarianInsights[0]?.rationale ??
    "Crowd narratives may over-index on hype and underweight execution risks.";
  const trendLine = topTrend
    ? `${topTrend.name}: ${topTrend.reason}`
    : "Trend visibility is limited for this topic.";

  const copyInsights = async () => {
    try {
      await navigator.clipboard.writeText(buildCopyPayload(analysis));
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("idle");
    }
  };

  const shareSnapshot = async () => {
    const snapshotUrl = `${window.location.origin}${window.location.pathname}?topic=${encodeURIComponent(
      analysis.topic,
    )}`;

    try {
      await navigator.clipboard.writeText(snapshotUrl);
      setShareState("shared");
      setTimeout(() => setShareState("idle"), 1600);
    } catch {
      setShareState("idle");
    }
  };

  return (
    <section className="mt-10 space-y-6">
      <header className="glass-panel rounded-3xl p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Intelligence dashboard
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {analysis.topic}
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              {analysis.executiveSummary.summary}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span
                className={`inline-flex rounded-full border px-3 py-1 font-semibold ${trendTone[trendDirection]}`}
              >
                {trendDirection.charAt(0).toUpperCase() + trendDirection.slice(1)} trend
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                {analysis.totalSignals} signals analyzed
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                {analysis.executiveSummary.confidence}% confidence
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyInsights}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {copyState === "copied" ? "Copied" : "Copy insights"}
            </button>
            <button
              type="button"
              onClick={shareSnapshot}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {shareState === "shared" ? "Snapshot copied" : "Share snapshot"}
            </button>
            <button
              type="button"
              onClick={onRegenerate}
              disabled={!onRegenerate || isRegenerating}
              className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isRegenerating ? "Regenerating..." : "Regenerate"}
            </button>
          </div>
        </div>
      </header>

      <section className="glass-panel rounded-3xl p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-950">Executive Summary</h3>
          {analysis.fromCache ? (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              Cached result
            </span>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <InsightCard title="Key insight" accent="default">
            <p className="text-base font-semibold text-slate-900">{executiveBullets[0] ?? analysis.executiveSummary.summary}</p>
          </InsightCard>
          <InsightCard title="Risk" accent="muted">
            <p>{riskLine}</p>
          </InsightCard>
          <InsightCard title="Trend" accent="default">
            <p>{trendLine}</p>
          </InsightCard>
        </div>

        <ul className="mt-5 list-disc space-y-2 pl-5 text-base leading-7 text-slate-800">
          {executiveBullets.slice(0, 6).map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>

        {analysis.dataQualityNote ? (
          <p className="mt-5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
            Data quality: {analysis.dataQualityNote}
          </p>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-950">Key Themes</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Core discourse signals
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {analysis.keyThemes.slice(0, 6).map((theme) => (
            <ThemeCard key={theme.name} theme={theme} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-950">Opportunities</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            High-value actions
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {analysis.opportunities.slice(0, 4).map((opportunity) => (
            <OpportunityCard key={opportunity.title} opportunity={opportunity} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-950">Contrarian Insights</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            What the crowd misses
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {analysis.contrarianInsights.slice(0, 3).map((insight) => (
            <article
              key={insight.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Contrarian</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-900">{insight.title}</h4>
              <p className="mt-3 text-sm leading-6 text-slate-700">{insight.rationale}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Why this is non-obvious
              </p>
              <p className="text-sm text-slate-600">
                {insight.whyCrowdMayBeWrong ?? insight.crowdBelief ?? "The mainstream narrative may miss this edge case."}
              </p>
              <p className="mt-3 text-xs text-slate-500">Signal: {insight.supportingSignal}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-panel rounded-3xl p-6">
        <details>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Evidence ({totalSources} sources)
              </h3>
              <p className="text-xs text-slate-500">
                Source data is de-emphasized by default to keep focus on high-signal insights.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              Expand
            </span>
          </summary>

          <div className="mt-4 space-y-2">
            {visibleSources.map((source: SourcePreview) => (
              <a
                key={`${source.platform}-${source.url}`}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  [{source.platform}]
                </span>
                {source.title}
              </a>
            ))}

            {analysis.sourceAccess?.canViewAll && hiddenSourceCount > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllEvidence((current) => !current)}
                className="mt-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {showAllEvidence
                  ? "Show fewer evidence sources"
                  : `Show ${hiddenSourceCount} more evidence sources`}
              </button>
            ) : null}

            {!analysis.sourceAccess?.canViewAll && (analysis.sourceAccess?.hiddenCount ?? 0) > 0 ? (
              <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                Free tier shows {analysis.sourceAccess?.defaultVisibleCount} sources. Upgrade to unlock {analysis.sourceAccess?.hiddenCount} more.
              </p>
            ) : null}
          </div>
        </details>
      </section>
    </section>
  );
}
