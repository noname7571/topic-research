import {
  ContrarianRadarSignal,
  ContentIdea,
  ContrarianInsight,
  DiscussionItem,
  ExecutiveSummary,
  OpportunityInsight,
  PlatformInsight,
  SourceCredibilityInsight,
  SentimentOverview,
  ThemeInsight,
  TrendInsight,
} from "@/lib/types";

import { scoreSentiment, sentimentFromScore } from "./sentiment";

const average = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const recencyWeight = (publishedAt: string): number => {
  const ageDays = Math.max(
    0,
    (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(0, 1 - ageDays / 30);
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const expertSignalScore = (item: DiscussionItem): number => {
  const text = `${item.title} ${item.snippet} ${item.author ?? ""} ${item.source}`.toLowerCase();
  let score = 36;

  if (item.platform === "news") {
    score += 24;
  } else if (item.platform === "web") {
    score += 12;
  } else if (item.platform === "youtube") {
    score += 6;
  }

  if (/analyst|research|operator|founder|engineer|investor|vc|study|report|data/.test(text)) {
    score += 16;
  }

  if ((item.commentCount ?? 0) >= 25) {
    score += 10;
  }

  if (item.engagement >= 900) {
    score += 12;
  }

  return clamp(score, 10, 100);
};

const relatedThemeItems = (items: DiscussionItem[], themeName: string): DiscussionItem[] => {
  const normalizedTheme = themeName.toLowerCase();
  const related = items.filter((item) =>
    `${item.title} ${item.snippet}`.toLowerCase().includes(normalizedTheme),
  );
  if (related.length > 0) {
    return related;
  }

  return [...items]
    .sort((left, right) => right.engagement - left.engagement)
    .slice(0, Math.min(5, items.length));
};

const sentimentBiasLabel = (
  sentiment: ThemeInsight["sentiment"],
): ContrarianRadarSignal["sentimentBias"] => {
  if (sentiment === "negative") {
    return "crowd-negative";
  }
  if (sentiment === "positive") {
    return "crowd-positive";
  }
  return "crowd-neutral";
};

const sentimentSkepticismScore = (sentiment: ThemeInsight["sentiment"]): number => {
  if (sentiment === "negative") {
    return 88;
  }
  if (sentiment === "neutral") {
    return 62;
  }
  return 34;
};

export const deriveContrarianRadar = (
  themes: ThemeInsight[],
  trends: TrendInsight[],
  items: DiscussionItem[],
): ContrarianRadarSignal[] => {
  const trendsByName = new Map(
    trends.map((trend) => [trend.name.toLowerCase(), trend] as const),
  );

  return themes
    .slice(0, 5)
    .map((theme) => {
      const trend = trendsByName.get(theme.name.toLowerCase());
      const relatedItems = relatedThemeItems(items, theme.name);
      const expertEngagement = average(relatedItems.map((item) => expertSignalScore(item)));

      const velocityBase = trend?.signalStrength ?? 45;
      const velocityDirectionBoost =
        trend?.direction === "rising" ? 18 : trend?.direction === "falling" ? -20 : 0;
      const velocityScore = clamp(velocityBase + velocityDirectionBoost, 0, 100);

      const skepticismScore = sentimentSkepticismScore(theme.sentiment);
      const contrarianScore = clamp(
        Math.round(skepticismScore * 0.4 + velocityScore * 0.35 + expertEngagement * 0.25),
        0,
        100,
      );

      const opportunityLevel: ContrarianRadarSignal["opportunityLevel"] =
        contrarianScore >= 74 ? "high" : contrarianScore >= 56 ? "medium" : "watch";

      const bias = sentimentBiasLabel(theme.sentiment);
      const rationale =
        bias === "crowd-negative"
          ? "Crowd sentiment is skeptical, but velocity and expert engagement indicate a possible upside mismatch."
          : bias === "crowd-neutral"
            ? "Conversation is indecisive while informed participants are increasingly active, creating asymmetry."
            : "Momentum is rising despite optimism fatigue, suggesting a focused niche angle can still outperform.";

      return {
        theme: theme.name,
        contrarianScore,
        opportunityLevel,
        sentimentBias: bias,
        velocityScore,
        expertEngagementScore: Math.round(expertEngagement),
        rationale,
      } satisfies ContrarianRadarSignal;
    })
    .sort((left, right) => right.contrarianScore - left.contrarianScore)
    .slice(0, 4);
};

const platformTrustBaseline: Record<DiscussionItem["platform"], number> = {
  news: 74,
  web: 61,
  youtube: 56,
  reddit: 54,
  mock: 58,
};

const reputableSourceHint =
  /reuters|associated press|ap news|bloomberg|wsj|wall street journal|bbc|ft|economist|techcrunch|the verge|nytimes|marketwatch/i;
const lowTrustHint =
  /affiliate|sponsored|promo|rumor|unverified|airdrop|casino|giveaway|clickbait/i;
const botLikeHint = /guaranteed|1000x|!!!|free money|instant profit|shocking/i;
const citationHint = /according to|study|report|survey|data|statistic|analysis|evidence|research/i;

const sourceAccuracyScore = (item: DiscussionItem): number => {
  const sourceText = `${item.source} ${item.title}`;
  let score = platformTrustBaseline[item.platform];

  if (reputableSourceHint.test(sourceText)) {
    score += 15;
  }

  if (lowTrustHint.test(sourceText)) {
    score -= 18;
  }

  if ((item.commentCount ?? 0) > 50) {
    score += 6;
  }

  return clamp(score, 5, 100);
};

const sourceConflictRisk = (item: DiscussionItem): number => {
  const text = `${item.title} ${item.snippet} ${item.source}`.toLowerCase();
  let risk = 30;

  if (item.platform === "youtube") {
    risk += 8;
  }
  if (item.platform === "news") {
    risk -= 8;
  }
  if (lowTrustHint.test(text)) {
    risk += 26;
  }
  if (/sponsor|discount|sale|promo|subscribe now|limited offer/.test(text)) {
    risk += 22;
  }

  return clamp(risk, 0, 100);
};

const sourceBotLikelihood = (item: DiscussionItem): number => {
  const text = `${item.title} ${item.snippet}`;
  const lower = text.toLowerCase();
  const uppercaseRatio = text.length > 0 ? (text.match(/[A-Z]/g)?.length ?? 0) / text.length : 0;

  let risk = item.platform === "web" ? 34 : 26;
  if (botLikeHint.test(lower)) {
    risk += 28;
  }
  if (uppercaseRatio > 0.28) {
    risk += 16;
  }
  if ((item.author ?? "").trim().length > 3) {
    risk -= 6;
  }

  return clamp(risk, 0, 100);
};

const sourceCitationDepth = (item: DiscussionItem): number => {
  const text = `${item.title} ${item.snippet}`;
  let score = 26 + Math.min(48, Math.round(item.snippet.length / 8));

  if (citationHint.test(text.toLowerCase())) {
    score += 16;
  }
  if (/\d/.test(text)) {
    score += 8;
  }

  return clamp(score, 0, 100);
};

const credibilityConfidence = (
  score: number,
): SourceCredibilityInsight["confidence"] => {
  if (score >= 74) {
    return "high";
  }
  if (score >= 56) {
    return "medium";
  }
  return "low";
};

export const deriveSourceCredibility = (
  items: DiscussionItem[],
): SourceCredibilityInsight[] => {
  const grouped = new Map<string, DiscussionItem[]>();

  for (const item of items) {
    const key = `${item.platform}:${item.source.toLowerCase()}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)?.push(item);
  }

  return Array.from(grouped.values())
    .map((groupedItems) => {
      const sample = groupedItems[0];
      const historicalAccuracy = Math.round(
        average(groupedItems.map((item) => sourceAccuracyScore(item))),
      );
      const conflictRisk = Math.round(
        average(groupedItems.map((item) => sourceConflictRisk(item))),
      );
      const botLikelihood = Math.round(
        average(groupedItems.map((item) => sourceBotLikelihood(item))),
      );
      const citationDepth = Math.round(
        average(groupedItems.map((item) => sourceCitationDepth(item))),
      );

      const credibilityScore = Math.round(
        clamp(
          historicalAccuracy * 0.42 +
            (100 - conflictRisk) * 0.24 +
            (100 - botLikelihood) * 0.2 +
            citationDepth * 0.14,
          0,
          100,
        ),
      );

      const weightedSignals = Math.round(
        groupedItems.reduce((sum, item) => {
          return sum + (item.engagement + 20) * (credibilityScore / 100);
        }, 0),
      );

      const confidence = credibilityConfidence(credibilityScore);
      const rationale =
        confidence === "high"
          ? "Consistent signal quality with lower manipulation risk and stronger evidence depth."
          : confidence === "medium"
            ? "Useful source with moderate trust signals; validate against higher-credibility channels."
            : "Lower trust indicators detected; treat claims as directional and verify externally.";

      return {
        source: sample.source,
        platform: sample.platform,
        credibilityScore,
        confidence,
        weightedSignals,
        itemCount: groupedItems.length,
        historicalAccuracy,
        conflictRisk,
        botLikelihood,
        citationDepth,
        rationale,
      } satisfies SourceCredibilityInsight;
    })
    .sort((left, right) => {
      const weightedDelta = right.weightedSignals - left.weightedSignals;
      return weightedDelta !== 0
        ? weightedDelta
        : right.credibilityScore - left.credibilityScore;
    })
    .slice(0, 8);
};

export const buildPlatformBreakdown = (items: DiscussionItem[]): PlatformInsight[] => {
  const grouped = new Map<string, DiscussionItem[]>();
  for (const item of items) {
    if (!grouped.has(item.platform)) {
      grouped.set(item.platform, []);
    }
    grouped.get(item.platform)?.push(item);
  }

  return Array.from(grouped.entries()).map(([platform, groupedItems]) => {
    const avgEngagement = average(groupedItems.map((item) => item.engagement));
    const sentimentScore = average(
      groupedItems.map((item) => scoreSentiment(`${item.title} ${item.snippet}`)),
    );

    return {
      platform: platform as PlatformInsight["platform"],
      itemCount: groupedItems.length,
      avgEngagement: Math.round(avgEngagement),
      sentiment: sentimentFromScore(sentimentScore),
    };
  });
};

export const deriveTrends = (
  themes: ThemeInsight[],
  items: DiscussionItem[],
): TrendInsight[] => {
  if (themes.length === 0) {
    return [];
  }

  const averageEngagement = average(items.map((item) => item.engagement));

  return themes.slice(0, 4).map((theme) => {
    const related = items.filter((item) =>
      `${item.title} ${item.snippet}`.toLowerCase().includes(theme.name.toLowerCase()),
    );

    const sampled = related.length > 0 ? related : items.slice(0, 4);
    const recency = average(sampled.map((item) => recencyWeight(item.publishedAt)));
    const engagement = average(sampled.map((item) => item.engagement));

    const direction =
      recency > 0.55 && engagement >= averageEngagement
        ? "rising"
        : recency < 0.3
          ? "falling"
          : "stable";

    return {
      name: theme.name,
      direction,
      signalStrength: Math.max(1, Math.min(100, Math.round(recency * 50 + (theme.volume / 2) * 10))),
      reason:
        direction === "rising"
          ? "Recent high-engagement activity is increasing around this discussion cluster."
          : direction === "falling"
            ? "Signal volume is aging and newer posts are less engaged."
            : "Conversation remains active but without clear acceleration.",
    };
  });
};

export const deriveOpportunities = (
  topic: string,
  themes: ThemeInsight[],
  trends: TrendInsight[],
  sentiment: SentimentOverview,
): OpportunityInsight[] => {
  const rising = trends.filter((trend) => trend.direction === "rising").slice(0, 2);
  const opportunities: OpportunityInsight[] = [];

  for (const trend of rising) {
    opportunities.push({
      title: `Build around ${trend.name.toLowerCase()} demand`,
      rationale:
        "Users are actively discussing unresolved workflows and showing high response rates to practical solutions.",
      confidence: Math.min(95, 60 + trend.signalStrength / 2),
    });
  }

  if (sentiment.negative > sentiment.positive) {
    opportunities.push({
      title: `Create a trust-first product angle for ${topic}`,
      rationale:
        "Negative sentiment indicates unmet expectations. Transparent pricing and onboarding can unlock conversion.",
      confidence: 72,
    });
  }

  if (opportunities.length === 0 && themes[0]) {
    opportunities.push({
      title: `Content moat around ${themes[0].name}`,
      rationale:
        "The highest-volume theme has recurring questions. A focused content + tool strategy can capture intent.",
      confidence: 68,
    });
  }

  return opportunities.slice(0, 4);
};

export const deriveContentIdeas = (
  topic: string,
  themes: ThemeInsight[],
  opportunities: OpportunityInsight[],
): ContentIdea[] => {
  const primaryTheme = themes[0]?.name ?? topic;
  const secondaryTheme = themes[1]?.name ?? "execution gaps";
  const topOpportunity = opportunities[0]?.title ?? `Build around ${primaryTheme}`;

  return [
    {
      title: `Why ${primaryTheme} is being misunderstood in 2026`,
      format: "youtube",
      hook: `Most people discussing ${primaryTheme.toLowerCase()} are optimizing the wrong metric.`,
      angle: "Break down what discourse says vs what demand signals actually imply.",
    },
    {
      title: `The hidden pain behind ${secondaryTheme}`,
      format: "twitter",
      hook: "7 patterns from real conversations that explain why current solutions underperform.",
      angle: "Thread using examples from high-engagement posts and clear takeaways.",
    },
    {
      title: `${topOpportunity} in 30 days`,
      format: "tiktok",
      hook: "If I had to launch this from zero, here is the exact fast path.",
      angle: "Fast execution blueprint with audience + messaging + validation loop.",
    },
  ];
};

export const deriveContrarianInsights = (
  topic: string,
  items: DiscussionItem[],
  themes: ThemeInsight[],
): ContrarianInsight[] => {
  const sortedByEngagement = [...items].sort(
    (left, right) => right.engagement - left.engagement,
  );

  const skepticalSignal = sortedByEngagement.find((item) =>
    /overhyped|concern|risk|problem|decline/i.test(`${item.title} ${item.snippet}`),
  );

  const optimisticSignal = sortedByEngagement.find((item) =>
    /opportunity|growth|promising|great|valuable/i.test(`${item.title} ${item.snippet}`),
  );

  const insights: ContrarianInsight[] = [];

  if (skepticalSignal) {
    insights.push({
      title: `${topic} may be more execution-limited than demand-limited`,
      rationale:
        "A significant share of high-engagement discussion points to weak implementation rather than lack of audience interest.",
      supportingSignal: skepticalSignal.title,
    });
  }

  if (optimisticSignal && themes[0]) {
    insights.push({
      title: `Niche positioning could outperform broad ${topic} offerings`,
      rationale:
        `Top conversations around ${themes[0].name.toLowerCase()} imply users reward focused solutions over horizontal products.`,
      supportingSignal: optimisticSignal.title,
    });
  }

  if (insights.length === 0) {
    insights.push({
      title: `${topic} momentum is real, but consensus remains fragile`,
      rationale:
        "Most communities are still experimenting with best practices, which creates room for differentiated opinions and products.",
      supportingSignal: sortedByEngagement[0]?.title ?? "Mixed sentiment across top sources",
    });
  }

  return insights.slice(0, 3);
};

export const buildExecutiveSummary = (
  topic: string,
  totalSignals: number,
  themes: ThemeInsight[],
  sentiment: SentimentOverview,
  trends: TrendInsight[],
): ExecutiveSummary => {
  const topTheme = themes[0]?.name ?? topic;
  const risingCount = trends.filter((trend) => trend.direction === "rising").length;
  const strongestTrend = trends[0]?.name ?? topTheme;
  const strongestThemeVolume = themes[0]?.volume ?? 0;

  return {
    headline: `${topic} discourse is clustering around ${topTheme}`,
    summary:
      `Analyzed ${totalSignals} high-signal discussions. Dominant sentiment is ${sentiment.dominant}, ` +
      `with ${risingCount} trend${risingCount === 1 ? "" : "s"} currently accelerating. ` +
      "The strongest opportunities are tied to practical execution gaps and clearer positioning.",
    bullets: [
      `${totalSignals} high-signal posts passed filtering after noise removal and deduplication.`,
      `The highest-volume discourse cluster is ${topTheme} (${strongestThemeVolume} supporting signals).`,
      `${sentiment.dominant} sentiment currently dominates this topic across analyzed sources.`,
      `${strongestTrend} is the most visible trend line based on recency and engagement.`,
      "The clearest opportunities are concentrated in practical pain points, not broad trend speculation.",
    ],
    confidence: Math.max(55, Math.min(92, 55 + Math.round(totalSignals / 4))),
  };
};
