import {
  ActionSimulation,
  AudienceReaction,
  ContentAngleForecast,
  ContrarianRadarSignal,
  ContentIdea,
  ContrarianInsight,
  DiscussionItem,
  EvidenceCitation,
  EvidenceInsightCard,
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

const reactionFromScore = (score: number): AudienceReaction => {
  if (score >= 66) {
    return "positive";
  }
  if (score >= 45) {
    return "mixed";
  }
  return "negative";
};

const channelFromAngle = (
  angle: string,
  index: number,
): ActionSimulation["channel"] => {
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

  const fallbackChannels: Array<ActionSimulation["channel"]> = [
    "twitter",
    "youtube",
    "landing-page",
  ];
  return fallbackChannels[index] ?? "landing-page";
};

const segmentReason = (
  segment: string,
  reaction: AudienceReaction,
  angle: string,
): string => {
  const conciseAngle = angle.length > 90 ? `${angle.slice(0, 87)}...` : angle;
  if (reaction === "positive") {
    return `${segment} are likely to engage because the angle feels concrete and directly useful: "${conciseAngle}".`;
  }
  if (reaction === "mixed") {
    return `${segment} may need stronger proof points before fully aligning with this angle.`;
  }
  return `${segment} are likely to challenge this framing unless it includes tighter evidence and clearer tradeoffs.`;
};

const scoreSegmentReaction = (
  segment: string,
  angle: string,
  baseSupport: number,
): number => {
  const lower = angle.toLowerCase();
  const evidenceKeywords = /proof|case study|example|benchmark|roi|before\/after|data|step-by-step|workflow/;
  const hypeKeywords = /revolution|insane|crazy|massive|everyone|guarantee|secret/;
  const nuanceKeywords = /tradeoff|risk|limit|constraint|assumption|validation/;
  const creatorKeywords = /content|hook|story|trend|viral|post|thread|video/;

  let score = baseSupport;

  if (segment === "Pragmatic buyers") {
    if (evidenceKeywords.test(lower)) {
      score += 14;
    }
    if (hypeKeywords.test(lower)) {
      score -= 12;
    }
  }

  if (segment === "Power users") {
    if (/build|operator|stack|api|system|execution|playbook|framework/.test(lower)) {
      score += 12;
    }
    if (creatorKeywords.test(lower)) {
      score += 5;
    }
  }

  if (segment === "Skeptics") {
    if (nuanceKeywords.test(lower)) {
      score += 15;
    }
    if (hypeKeywords.test(lower)) {
      score -= 16;
    }
  }

  return clamp(Math.round(score), 5, 95);
};

export const deriveActionSimulator = (
  topic: string,
  themes: ThemeInsight[],
  trends: TrendInsight[],
  opportunities: OpportunityInsight[],
  sentiment: SentimentOverview,
): ActionSimulation[] => {
  const totalMentions = Math.max(
    1,
    sentiment.positive + sentiment.neutral + sentiment.negative,
  );
  const positiveRatio = sentiment.positive / totalMentions;
  const negativeRatio = sentiment.negative / totalMentions;
  const topTrend = trends[0];
  const trendBoost =
    topTrend?.direction === "rising" ? 8 : topTrend?.direction === "falling" ? -8 : 0;

  const baseSupport = clamp(
    Math.round(50 + (positiveRatio - negativeRatio) * 32 + trendBoost),
    18,
    82,
  );

  const scenarioSeeds =
    opportunities.length > 0
      ? opportunities.slice(0, 3).map((opportunity, index) => ({
          angle:
            opportunity.executionIdea ??
            `Publish a focused angle around ${opportunity.title.toLowerCase()}.`,
          fallbackTheme: themes[index]?.name ?? themes[0]?.name ?? topic,
        }))
      : [
          {
            angle: `Publish a proof-first angle on ${themes[0]?.name ?? topic} with concrete outcomes and tradeoffs.`,
            fallbackTheme: themes[0]?.name ?? topic,
          },
        ];

  const segments = ["Pragmatic buyers", "Power users", "Skeptics"];

  return scenarioSeeds.map((seed, index) => {
    const angle = seed.angle;
    const channel = channelFromAngle(angle, index);
    const audienceReactions = segments.map((segment) => {
      const score = scoreSegmentReaction(segment, angle, baseSupport);
      const reaction = reactionFromScore(score);
      const confidence = clamp(55 + Math.abs(score - 50), 55, 90);

      return {
        segment,
        reaction,
        confidence,
        reason: segmentReason(segment, reaction, angle),
      };
    });

    const averageReactionScore = average(
      audienceReactions.map((item) => {
        if (item.reaction === "positive") {
          return 80;
        }
        if (item.reaction === "mixed") {
          return 55;
        }
        return 30;
      }),
    );

    const upsideScore = clamp(
      Math.round(averageReactionScore + (topTrend?.signalStrength ?? 45) * 0.15),
      0,
      100,
    );
    const skepticConfidence =
      audienceReactions.find((item) => item.segment === "Skeptics")?.confidence ?? 60;
    const skepticReaction =
      audienceReactions.find((item) => item.segment === "Skeptics")?.reaction ?? "mixed";
    const backlashRisk = clamp(
      Math.round(
        100 -
          (skepticReaction === "positive"
            ? 76
            : skepticReaction === "mixed"
              ? 54
              : 32) +
          (90 - skepticConfidence) * 0.2,
      ),
      8,
      92,
    );

    const recommendation =
      backlashRisk > upsideScore
        ? `Reframe this ${channel} angle with stronger evidence and explicit tradeoffs before publishing.`
        : `Ship this ${channel} angle with one concrete proof element and audience-specific CTA.`;

    return {
      angle,
      channel,
      audienceReactions,
      upsideScore,
      backlashRisk,
      recommendation:
        themes.length > 0
          ? `${recommendation} Anchor it to ${seed.fallbackTheme.toLowerCase()} discussion patterns.`
          : recommendation,
    } satisfies ActionSimulation;
  });
};

const claimKeywords = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3)
    .slice(0, 16);
};

const citationRelevanceScore = (item: DiscussionItem, keywords: string[]): number => {
  const searchable = `${item.title} ${item.snippet}`.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (searchable.includes(keyword)) {
      score += 1;
    }
  }
  return score;
};

const uncertaintyFromConfidence = (
  confidence: number,
  citationCount: number,
  platformDiversity: number,
): string => {
  if (confidence < 60) {
    return "Confidence is moderate. Validate with additional data before making irreversible decisions.";
  }

  if (citationCount < 2 || platformDiversity < 2) {
    return "Signal is strong but source diversity is limited. Cross-check with at least one additional platform.";
  }

  return "Uncertainty is low for directional strategy, but outcomes still depend on execution quality and timing.";
};

export const deriveEvidenceCards = (
  topic: string,
  themes: ThemeInsight[],
  opportunities: OpportunityInsight[],
  contrarianInsights: ContrarianInsight[],
  items: DiscussionItem[],
  sourceCredibility: SourceCredibilityInsight[],
): EvidenceInsightCard[] => {
  const credibilityBySource = new Map(
    sourceCredibility.map((entry) => [
      `${entry.platform}:${entry.source.toLowerCase()}`,
      entry.credibilityScore,
    ]),
  );

  const claimSeeds = [
    themes[0] ? `${themes[0].name} is a primary demand driver in current discourse.` : "",
    opportunities[0]
      ? `${opportunities[0].title} is currently the highest-leverage execution path.`
      : "",
    contrarianInsights[0]
      ? `${contrarianInsights[0].title} has measurable supporting evidence beyond crowd consensus.`
      : "",
    `${topic} conversations show a practical execution gap that can be converted into strategic advantage.`,
  ].filter(Boolean);

  return claimSeeds.slice(0, 4).map((claim) => {
    const keywords = claimKeywords(claim);

    const ranked = [...items]
      .map((item) => {
        const sourceKey = `${item.platform}:${item.source.toLowerCase()}`;
        const credibility = credibilityBySource.get(sourceKey) ?? 52;
        const relevance = citationRelevanceScore(item, keywords);
        const engagementScore = Math.min(30, Math.log10(item.engagement + 10) * 11);
        const recencyScore = recencyWeight(item.publishedAt) * 20;

        return {
          item,
          credibility,
          score: relevance * 7 + credibility * 0.35 + engagementScore + recencyScore,
        };
      })
      .sort((left, right) => right.score - left.score);

    const citations: EvidenceCitation[] = [];
    const seenUrls = new Set<string>();

    for (const row of ranked) {
      if (seenUrls.has(row.item.url)) {
        continue;
      }
      seenUrls.add(row.item.url);
      citations.push({
        title: row.item.title,
        url: row.item.url,
        platform: row.item.platform,
        source: row.item.source,
      });
      if (citations.length >= 3) {
        break;
      }
    }

    const citationCredibility = citations.map((citation) => {
      return (
        credibilityBySource.get(`${citation.platform}:${citation.source.toLowerCase()}`) ?? 52
      );
    });
    const averageCredibility = average(citationCredibility);
    const platformDiversity = new Set(citations.map((citation) => citation.platform)).size;

    const confidence = clamp(
      Math.round(
        42 + averageCredibility * 0.4 + citations.length * 7 + platformDiversity * 4,
      ),
      38,
      95,
    );

    return {
      claim,
      confidence,
      uncertainty: uncertaintyFromConfidence(confidence, citations.length, platformDiversity),
      citations,
    } satisfies EvidenceInsightCard;
  });
};

export const deriveContentAngleEngine = (
  topic: string,
  themes: ThemeInsight[],
  opportunities: OpportunityInsight[],
  contrarianRadar: ContrarianRadarSignal[],
  actionSimulator: ActionSimulation[],
  contentIdeas: ContentIdea[],
): ContentAngleForecast[] => {
  const topTheme = themes[0]?.name ?? topic;
  const secondTheme = themes[1]?.name ?? "execution gaps";
  const topOpportunity = opportunities[0]?.title ?? `Build around ${topTheme}`;
  const radarSignal = contrarianRadar[0];
  const radarScore = radarSignal?.contrarianScore ?? 56;

  const scenarioByChannel = new Map<string, ActionSimulation>(
    actionSimulator.map((scenario) => [scenario.channel, scenario] as const),
  );

  const seeds: Array<
    Omit<ContentAngleForecast, "resonanceScore"> & { channelWeight: number }
  > = [
    {
      title: `${topTheme}: the take everyone repeats that is directionally wrong`,
      channel: "youtube",
      targetAudience: "Operators and strategic buyers",
      hook: `Most coverage on ${topTheme.toLowerCase()} misses the constraint that actually decides outcomes.`,
      rationale: "Long-form narrative correction with concrete examples and tradeoff breakdowns.",
      channelWeight: 9,
    },
    {
      title: `Thread: why ${topOpportunity.toLowerCase()} beats feature-first launches`,
      channel: "twitter",
      targetAudience: "Builders and growth teams",
      hook: "A contrarian build path with 5 evidence-backed moves the crowd usually skips.",
      rationale: "Fast, shareable argument chain that converts contrarian signal into practical execution.",
      channelWeight: 8,
    },
    {
      title: `${secondTheme} playbook for teams that need trust before scale`,
      channel: "linkedin",
      targetAudience: "B2B decision makers",
      hook: "The messaging shift that lowers buyer skepticism without discounting your product.",
      rationale: "Authority-led framing with credibility-first positioning and explicit assumptions.",
      channelWeight: 7,
    },
    {
      title: `30-second teardown: the hidden risk in "obvious" ${topic} strategies`,
      channel: "tiktok",
      targetAudience: "Creators and early adopters",
      hook: "One chart, one myth, one better move.",
      rationale: "High-retention short format designed around narrative reversal and practical CTA.",
      channelWeight: 7,
    },
    {
      title: `Weekly intelligence brief: where ${topic} demand is mutating`,
      channel: "newsletter",
      targetAudience: "Founders and product leads",
      hook: "Top shifts, weak signals, and one decision recommendation for next week.",
      rationale: "Recurring format that compounds trust with evidence-first trend interpretation.",
      channelWeight: 8,
    },
  ];

  return seeds.map((seed, index) => {
    const matchingScenario = scenarioByChannel.get(seed.channel) ?? actionSimulator[index % Math.max(1, actionSimulator.length)];
    const simulationUpside = matchingScenario?.upsideScore ?? 58;
    const simulationRisk = matchingScenario?.backlashRisk ?? 38;
    const ideaBoost = contentIdeas[index]?.format
      ? contentIdeas[index]?.format === "youtube" && seed.channel === "youtube"
        ? 6
        : contentIdeas[index]?.format === "twitter" && seed.channel === "twitter"
          ? 6
          : contentIdeas[index]?.format === "tiktok" && seed.channel === "tiktok"
            ? 6
            : 2
      : 0;

    const resonanceScore = clamp(
      Math.round(
        40 +
          radarScore * 0.22 +
          simulationUpside * 0.35 -
          simulationRisk * 0.18 +
          seed.channelWeight +
          ideaBoost,
      ),
      30,
      96,
    );

    return {
      title: seed.title,
      channel: seed.channel,
      targetAudience: seed.targetAudience,
      resonanceScore,
      hook: seed.hook,
      rationale: seed.rationale,
    } satisfies ContentAngleForecast;
  });
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
