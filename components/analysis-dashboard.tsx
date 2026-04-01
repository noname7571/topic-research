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

const reactionTone = {
  positive: "border-emerald-200 bg-emerald-50 text-emerald-700",
  mixed: "border-amber-200 bg-amber-50 text-amber-700",
  negative: "border-rose-200 bg-rose-50 text-rose-700",
};

const confidenceTone = (confidence: number): string => {
  if (confidence >= 75) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (confidence >= 60) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-rose-200 bg-rose-50 text-rose-700";
};

const resonanceTone = (score: number): string => {
  if (score >= 75) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (score >= 60) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-700";
};

const clampScore = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const reactionFromScore = (
  score: number,
): AnalysisResult["actionSimulator"][number]["audienceReactions"][number]["reaction"] => {
  if (score >= 66) {
    return "positive";
  }
  if (score >= 45) {
    return "mixed";
  }
  return "negative";
};

const inferChannel = (
  angle: string,
): AnalysisResult["actionSimulator"][number]["channel"] => {
  const lower = angle.toLowerCase();
  if (/youtube|video|short/.test(lower)) {
    return "youtube";
  }
  if (/twitter|thread|x\b/.test(lower)) {
    return "twitter";
  }
  if (/tiktok|reel/.test(lower)) {
    return "tiktok";
  }
  if (/linkedin/.test(lower)) {
    return "linkedin";
  }
  return "landing-page";
};

const deriveCustomActionSimulation = (
  angle: string,
  analysis: AnalysisResult,
): AnalysisResult["actionSimulator"][number] => {
  const sentimentTotal =
    analysis.sentimentOverview.positive +
    analysis.sentimentOverview.neutral +
    analysis.sentimentOverview.negative;
  const positiveRatio =
    sentimentTotal > 0 ? analysis.sentimentOverview.positive / sentimentTotal : 0.33;
  const negativeRatio =
    sentimentTotal > 0 ? analysis.sentimentOverview.negative / sentimentTotal : 0.33;
  const trendBoost =
    analysis.trends[0]?.direction === "rising"
      ? 8
      : analysis.trends[0]?.direction === "falling"
        ? -8
        : 0;

  const base = clampScore(Math.round(50 + (positiveRatio - negativeRatio) * 30 + trendBoost), 20, 80);
  const lower = angle.toLowerCase();
  const evidenceBonus = /proof|case study|example|data|benchmark|roi|workflow|step-by-step/.test(lower)
    ? 12
    : 0;
  const nuanceBonus = /tradeoff|risk|constraint|limit|assumption|validation/.test(lower)
    ? 10
    : 0;
  const hypePenalty = /crazy|insane|revolution|guarantee|secret|everyone/.test(lower)
    ? 12
    : 0;

  const segmentScores = [
    {
      segment: "Pragmatic buyers",
      score: clampScore(base + evidenceBonus - hypePenalty + 6, 5, 95),
    },
    {
      segment: "Power users",
      score: clampScore(base + evidenceBonus + (/build|operator|api|system|playbook/.test(lower) ? 10 : 2), 5, 95),
    },
    {
      segment: "Skeptics",
      score: clampScore(base + nuanceBonus - hypePenalty - 4, 5, 95),
    },
  ];

  const audienceReactions = segmentScores.map((item) => {
    const reaction = reactionFromScore(item.score);
    const confidence = clampScore(55 + Math.abs(item.score - 50), 55, 90);

    return {
      segment: item.segment,
      reaction,
      confidence,
      reason:
        reaction === "positive"
          ? "Likely to respond well if execution includes clear proof points."
          : reaction === "mixed"
            ? "May engage, but needs stronger specificity and evidence."
            : "Likely to challenge this unless claims are narrowed and validated.",
    };
  });

  const upsideScore = clampScore(
    Math.round(
      segmentScores.reduce((sum, item) => sum + item.score, 0) / segmentScores.length +
        (analysis.contrarianRadar[0]?.contrarianScore ?? 50) * 0.15,
    ),
    0,
    100,
  );
  const skepticScore = segmentScores.find((item) => item.segment === "Skeptics")?.score ?? 50;
  const backlashRisk = clampScore(100 - skepticScore + hypePenalty, 8, 92);

  return {
    angle,
    channel: inferChannel(angle),
    audienceReactions,
    upsideScore,
    backlashRisk,
    recommendation:
      backlashRisk > upsideScore
        ? "Revise the angle with tighter claims, concrete proof, and explicit tradeoffs before publishing."
        : "Ship this angle and pair it with one proof asset tailored to your highest-value audience segment.",
  };
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

  const actionSimulator = (analysis.actionSimulator ?? [])
    .slice(0, 4)
    .map(
      (item) =>
        `- [${item.channel}] ${item.angle} | upside ${item.upsideScore} | backlash risk ${item.backlashRisk}`,
    )
    .join("\n");

  const evidenceCards = (analysis.evidenceCards ?? [])
    .slice(0, 4)
    .map((card) => `- ${card.claim} | confidence ${card.confidence}`)
    .join("\n");

  const contentAngles = (analysis.contentAngleEngine ?? [])
    .slice(0, 6)
    .map(
      (item) =>
        `- [${item.channel}] ${item.title} -> ${item.targetAudience} | resonance ${item.resonanceScore}`,
    )
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
    "Evidence-first cards:",
    evidenceCards,
    "",
    "Action simulator:",
    actionSimulator,
    "",
    "Content angle engine:",
    contentAngles,
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
  const [simulatorAngle, setSimulatorAngle] = useState("");
  const [customSimulation, setCustomSimulation] = useState<
    AnalysisResult["actionSimulator"][number] | null
  >(null);
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
  const actionSimulatorLocked = isSectionLocked(analysis, "actionSimulator");
  const contentLocked = isSectionLocked(analysis, "contentIdeas");
  const evidenceLocked = isSectionLocked(analysis, "evidenceDepth");
  const contrarianRadar = analysis.contrarianRadar ?? [];
  const sourceCredibility = analysis.sourceCredibility ?? [];
  const evidenceCards = analysis.evidenceCards ?? [];
  const contentAngleEngine = analysis.contentAngleEngine ?? [];
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
  const actionSimulatorItems: AnalysisResult["actionSimulator"] =
    analysis.actionSimulator.length > 0
      ? analysis.actionSimulator.slice(0, 4)
      : [
          {
            angle: "Action simulation locked",
            channel: "landing-page",
            audienceReactions: [
              {
                segment: "Pragmatic buyers",
                reaction: "mixed",
                confidence: 0,
                reason: "Upgrade to test custom publish angles before launch.",
              },
            ],
            upsideScore: 0,
            backlashRisk: 0,
            recommendation: "Unlock Pro to use the action simulator.",
          },
        ];
  const evidenceCardItems: AnalysisResult["evidenceCards"] =
    evidenceCards.length > 0
      ? evidenceCards.slice(0, 4)
      : [
          {
            claim: "Evidence-first cards locked",
            confidence: 0,
            uncertainty: "Upgrade to unlock confidence scoring, uncertainty notes, and citation-linked claims.",
            citations: [],
          },
        ];
  const contentAngleItems: AnalysisResult["contentAngleEngine"] =
    contentAngleEngine.length > 0
      ? contentAngleEngine.slice(0, 6)
      : [
          {
            title: "Content angle engine locked",
            channel: "newsletter",
            targetAudience: "Paid members",
            resonanceScore: 0,
            hook: "Upgrade to unlock predicted resonance by channel and audience.",
            rationale: "Paid plans include the full content angle engine.",
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

  const runCustomSimulation = () => {
    const trimmed = simulatorAngle.trim();
    if (trimmed.length < 8 || actionSimulatorLocked) {
      return;
    }

    setCustomSimulation(deriveCustomActionSimulation(trimmed, analysis));
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

      <section className="relative space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-950">Evidence-First Insight Cards</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Claims with citations and uncertainty
          </p>
        </div>

        <div className={`grid gap-4 lg:grid-cols-2 ${evidenceLocked ? "pointer-events-none blur-[2px]" : ""}`}>
          {evidenceCardItems.map((card, index) => (
            <article
              key={`${card.claim}-${index}`}
              className="rounded-2xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Claim</p>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${confidenceTone(
                    card.confidence,
                  )}`}
                >
                  Confidence {card.confidence}
                </span>
              </div>
              <h4 className="mt-2 text-base font-semibold text-slate-900">{card.claim}</h4>
              <p className="mt-2 text-sm text-slate-600">Uncertainty: {card.uncertainty}</p>

              {card.citations.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Citations
                  </p>
                  {card.citations.map((citation) => (
                    <a
                      key={`${citation.platform}-${citation.url}`}
                      href={citation.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-white"
                    >
                      <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        [{citation.platform}]
                      </span>
                      {citation.title}
                    </a>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {evidenceLocked ? <LockedOverlay title="Evidence-first cards" /> : null}
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
          <h3 className="text-xl font-bold text-slate-950">Action Simulator</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Test publish angles before launch
          </p>
        </div>

        <div className={`${actionSimulatorLocked ? "pointer-events-none blur-[2px]" : ""}`}>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-700">
              Enter an angle and forecast likely reactions across audience segments.
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={simulatorAngle}
                onChange={(event) => setSimulatorAngle(event.target.value)}
                placeholder="Example: Publish a proof-first thread comparing outcomes with and without this workflow"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900"
              />
              <button
                type="button"
                onClick={runCustomSimulation}
                disabled={actionSimulatorLocked || simulatorAngle.trim().length < 8}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                Simulate angle
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {[...(customSimulation ? [customSimulation] : []), ...actionSimulatorItems]
              .slice(0, 4)
              .map((scenario, index) => (
                <article key={`${scenario.channel}-${scenario.angle}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {scenario.channel}
                    </p>
                    <div className="flex gap-2">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        Upside {scenario.upsideScore}
                      </span>
                      <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                        Risk {scenario.backlashRisk}
                      </span>
                    </div>
                  </div>
                  <h4 className="mt-2 text-base font-semibold text-slate-900">{scenario.angle}</h4>
                  <div className="mt-4 space-y-2">
                    {scenario.audienceReactions.map((reaction) => (
                      <div key={reaction.segment} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{reaction.segment}</p>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${
                              reactionTone[reaction.reaction]
                            }`}
                          >
                            {reaction.reaction} ({reaction.confidence})
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">{reaction.reason}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{scenario.recommendation}</p>
                </article>
              ))}
          </div>
        </div>

        {actionSimulatorLocked ? <LockedOverlay title="Action simulator" /> : null}
      </section>

      <section className="relative space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-950">Content Angle Engine</h3>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Bold angles with resonance forecasts
          </p>
        </div>

        <div className={`grid gap-4 lg:grid-cols-3 ${contentLocked ? "pointer-events-none blur-[2px]" : ""}`}>
          {contentAngleItems.map((angle, index) => (
            <article key={`${angle.channel}-${angle.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {angle.channel}
                </p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${resonanceTone(
                    angle.resonanceScore,
                  )}`}
                >
                  Resonance {angle.resonanceScore}
                </span>
              </div>
              <h4 className="mt-2 text-base font-semibold text-slate-900">{angle.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-700">{angle.hook}</p>
              <p className="mt-2 text-xs text-slate-500">Audience: {angle.targetAudience}</p>
              <p className="mt-1 text-xs text-slate-500">Why it should work: {angle.rationale}</p>
            </article>
          ))}
        </div>

        {contentLocked ? <LockedOverlay title="Content angle engine" /> : null}
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
