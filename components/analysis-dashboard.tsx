"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { OpportunityCard } from "@/components/intelligence/opportunity-card";
import { InsightCard } from "@/components/intelligence/insight-card";
import { ThemeCard } from "@/components/intelligence/theme-card";
import { AnalysisResult, LockedSection, SourcePreview } from "@/lib/types";

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

const radarTone = {
  high: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  watch: "border-slate-200 bg-slate-100 text-slate-700",
};

const credibilityTone = {
  high: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  low: "border-rose-200 bg-rose-50 text-rose-700",
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

  const contentIdeas = analysis.contentIdeas
    .slice(0, 5)
    .map((item) => `- [${item.format}] ${item.title}: ${item.hook}`)
    .join("\n");

  const contrarianRadar = (analysis.contrarianRadar ?? [])
    .slice(0, 4)
    .map(
      (item) =>
        `- ${item.theme}: score ${item.contrarianScore}, velocity ${item.velocityScore}, expert engagement ${item.expertEngagementScore}`,
    )
    .join("\n");

  const sourceCredibility = (analysis.sourceCredibility ?? [])
    .slice(0, 6)
    .map(
      (item) =>
        `- ${item.source} (${item.platform}): credibility ${item.credibilityScore}, weighted signal ${item.weightedSignals}`,
    )
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
    "",
    "Contrarian radar:",
    contrarianRadar,
    "",
    "Source credibility:",
    sourceCredibility,
    "",
    "Content ideas:",
    contentIdeas,
  ].join("\n");
};

const isSectionLocked = (analysis: AnalysisResult, section: LockedSection): boolean => {
  return analysis.accessContext?.lockedSections.includes(section) ?? false;
};

function LockedOverlay({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/70 backdrop-blur-[2px]">
      <div className="mx-4 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-900">{title} locked on Free</p>
        <p className="mt-1 text-xs text-slate-600">Upgrade to unlock full analysis depth.</p>
        <Link
          href="/pricing"
          className="mt-3 inline-flex rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Unlock full analysis
        </Link>
      </div>
    </div>
  );
}

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
  const trendLocked = isSectionLocked(analysis, "trendAnalysis");
  const opportunitiesLocked = isSectionLocked(analysis, "opportunities");
  const contrarianLocked = isSectionLocked(analysis, "contrarianInsights");
  const contentLocked = isSectionLocked(analysis, "contentIdeas");
  const evidenceLocked = isSectionLocked(analysis, "evidenceDepth");
  const contrarianRadar = analysis.contrarianRadar ?? [];
  const sourceCredibility = analysis.sourceCredibility ?? [];
  const radarItems: AnalysisResult["contrarianRadar"] =
    contrarianRadar.length > 0
      ? contrarianRadar.slice(0, 4)
      : [
          {
            theme: "Contrarian radar locked",
            contrarianScore: 0,
            opportunityLevel: "watch",
            sentimentBias: "crowd-neutral",
            velocityScore: 0,
            expertEngagementScore: 0,
            rationale: "Upgrade to reveal where market skepticism and accelerating signal diverge.",
          },
        ];
  const credibilityItems: AnalysisResult["sourceCredibility"] =
    sourceCredibility.length > 0
      ? sourceCredibility.slice(0, 6)
      : [
          {
            source: "Credibility layer locked",
            platform: "web",
            credibilityScore: 0,
            confidence: "low",
            weightedSignals: 0,
            itemCount: 0,
            historicalAccuracy: 0,
            conflictRisk: 0,
            botLikelihood: 0,
            citationDepth: 0,
            rationale: "Upgrade to unlock trust-weighted evidence ranking.",
          },
        ];

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
              {analysis.accessContext ? (
                <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold text-slate-700">
                  {analysis.accessContext.plan.toUpperCase()} plan
                </span>
              ) : null}
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

      <section className="relative space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-950">Trend Analysis</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Signal score 0-100
          </p>
        </div>

        <div className={`${trendLocked ? "pointer-events-none blur-[2px]" : ""}`}>
          <div className="grid gap-3 md:grid-cols-2">
            {(analysis.trends.length > 0
              ? analysis.trends.slice(0, 4)
              : [
                  {
                    name: "Locked trend intelligence",
                    direction: "stable",
                    signalStrength: 0,
                    reason: "Upgrade to unlock full trend movement analysis.",
                  },
                ]
            ).map((trend) => (
              <article
                key={`${trend.name}-${trend.direction}`}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-base font-semibold text-slate-900">{trend.name}</h4>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    Score {trend.signalStrength}
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                  {trend.direction} signal
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{trend.reason}</p>
              </article>
            ))}
          </div>
        </div>

        {trendLocked ? <LockedOverlay title="Trend analysis" /> : null}
      </section>

      <section className="relative space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-950">Opportunities</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            High-value actions
          </p>
        </div>

        <div className={`grid gap-4 lg:grid-cols-2 ${opportunitiesLocked ? "pointer-events-none blur-[2px]" : ""}`}>
          {(analysis.opportunities.length > 0
            ? analysis.opportunities.slice(0, 4)
            : [
                {
                  title: "Locked opportunity analysis",
                  rationale: "Upgrade to unlock actionable opportunities from discourse pain points.",
                  confidence: 0,
                  whyNow: "Pro and Premium only",
                  executionIdea: "Use pricing to unlock this section",
                  audience: "Members on paid plans",
                },
              ]
          ).map((opportunity) => (
            <OpportunityCard key={opportunity.title} opportunity={opportunity} />
          ))}
        </div>

        {opportunitiesLocked ? <LockedOverlay title="Opportunities" /> : null}
      </section>

      <section className="relative space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-950">Contrarian Insights</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            What the crowd misses
          </p>
        </div>

        <div className={`grid gap-4 lg:grid-cols-3 ${contrarianLocked ? "pointer-events-none blur-[2px]" : ""}`}>
          {(analysis.contrarianInsights.length > 0
            ? analysis.contrarianInsights.slice(0, 3)
            : [
                {
                  title: "Contrarian intelligence locked",
                  rationale: "Upgrade to see where crowd consensus may be misleading.",
                  supportingSignal: "Paid plans unlock this section",
                  crowdBelief: "Consensus is enough",
                  whyCrowdMayBeWrong: "The best opportunities often appear in minority narratives.",
                },
              ]
          ).map((insight) => (
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

        {contrarianLocked ? <LockedOverlay title="Contrarian insights" /> : null}
      </section>

      <section className="relative space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-950">Contrarian Signal Radar</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Early asymmetry detector
          </p>
        </div>

        <div className={`grid gap-4 md:grid-cols-2 ${contrarianLocked ? "pointer-events-none blur-[2px]" : ""}`}>
          {radarItems.map((radar) => (
            <article key={radar.theme} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-base font-semibold text-slate-900">{radar.theme}</h4>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${
                    radarTone[radar.opportunityLevel]
                  }`}
                >
                  {radar.opportunityLevel}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-700">{radar.rationale}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Score</p>
                  <p className="text-sm font-semibold text-slate-900">{radar.contrarianScore}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Velocity</p>
                  <p className="text-sm font-semibold text-slate-900">{radar.velocityScore}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Experts</p>
                  <p className="text-sm font-semibold text-slate-900">{radar.expertEngagementScore}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">Bias: {radar.sentimentBias}</p>
            </article>
          ))}
        </div>

        {contrarianLocked ? <LockedOverlay title="Contrarian signal radar" /> : null}
      </section>

      <section className="relative space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-950">Content Engine</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            YouTube, Twitter, TikTok hooks
          </p>
        </div>

        <div className={`grid gap-4 lg:grid-cols-3 ${contentLocked ? "pointer-events-none blur-[2px]" : ""}`}>
          {(analysis.contentIdeas.length > 0
            ? analysis.contentIdeas.slice(0, 9)
            : [
                {
                  title: "Content ideas locked",
                  format: "youtube",
                  hook: "Upgrade to unlock discourse-backed content hooks.",
                  angle: "Paid plans get full content engine output.",
                },
              ]
          ).map((idea) => (
            <article key={`${idea.format}-${idea.title}`} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{idea.format}</p>
              <h4 className="mt-1 text-base font-semibold text-slate-900">{idea.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-700">{idea.hook}</p>
              <p className="mt-2 text-xs text-slate-500">Angle: {idea.angle}</p>
            </article>
          ))}
        </div>

        {contentLocked ? <LockedOverlay title="Content engine" /> : null}
      </section>

      <section className="glass-panel relative rounded-3xl p-6">
        <div className={`mb-6 ${evidenceLocked ? "pointer-events-none blur-[2px]" : ""}`}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Source Credibility Layer</h3>
            <p className="text-xs text-slate-500">Trust-weighted signals</p>
          </div>
          <div className="space-y-2">
            {credibilityItems.map((source) => (
              <article
                key={`${source.platform}-${source.source}`}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{source.source}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{source.platform}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${
                        credibilityTone[source.confidence]
                      }`}
                    >
                      {source.confidence}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      Cred {source.credibilityScore}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-slate-600">{source.rationale}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                  <span>Weighted signal: {source.weightedSignals}</span>
                  <span>Items: {source.itemCount}</span>
                  <span>Accuracy: {source.historicalAccuracy}</span>
                  <span>Conflict risk: {source.conflictRisk}</span>
                  <span>Bot risk: {source.botLikelihood}</span>
                  <span>Citation depth: {source.citationDepth}</span>
                </div>
              </article>
            ))}
          </div>
        </div>

        <details className={evidenceLocked ? "pointer-events-none blur-[2px]" : ""}>
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
                {analysis.accessContext?.plan === "free"
                  ? `Free tier shows ${analysis.sourceAccess?.defaultVisibleCount} sources. Upgrade to unlock ${analysis.sourceAccess?.hiddenCount} more.`
                  : `This plan shows ${analysis.sourceAccess?.defaultVisibleCount} sources by default. Upgrade for deeper evidence access.`}
              </p>
            ) : null}
          </div>
        </details>

        {evidenceLocked ? <LockedOverlay title="Extended evidence" /> : null}
      </section>
    </section>
  );
}
