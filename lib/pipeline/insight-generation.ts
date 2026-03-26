import {
  ContentIdea,
  ContrarianInsight,
  DiscussionItem,
  ExecutiveSummary,
  OpportunityInsight,
  PlatformInsight,
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
