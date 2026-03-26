import { generateAiEnhancements } from "@/lib/ai/openai";
import { fetchDiscussions } from "@/lib/data";
import { AnalysisResult, DiscussionItem } from "@/lib/types";

import { clusterThemes } from "./clustering";
import { filterNoise } from "./filtering";
import {
  buildExecutiveSummary,
  buildPlatformBreakdown,
  deriveContrarianInsights,
  deriveContentIdeas,
  deriveOpportunities,
  deriveTrends,
} from "./insight-generation";
import { expandQueries } from "./query-expansion";
import { annotateSentiment, summarizeSentiment } from "./sentiment";

const pickSampleSources = (items: DiscussionItem[]): AnalysisResult["sampleSources"] => {
  return [...items]
    .sort((left, right) => {
      const dateDelta =
        new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
      return dateDelta !== 0 ? dateDelta : right.engagement - left.engagement;
    })
    .slice(0, 40)
    .map((item) => ({
      title: item.title,
      url: item.url,
      platform: item.platform,
    }));
};

const enrichThemeDetail = (
  themes: AnalysisResult["keyThemes"],
): AnalysisResult["keyThemes"] => {
  const inferNarrative = (theme: AnalysisResult["keyThemes"][number]) => {
    const text = `${theme.name} ${theme.summary} ${theme.whatPeopleAreSaying ?? ""}`.toLowerCase();
    if (/fear|risk|anxiety|unsafe|scam|decline|problem/.test(text)) {
      return "fear" as const;
    }
    if (/hype|viral|boom|exploding|craze|fomo/.test(text)) {
      return "hype" as const;
    }
    if (/build|gap|need|demand|opportunit/.test(text)) {
      return "opportunity" as const;
    }
    return "confusion" as const;
  };

  return themes.map((theme) => ({
    ...theme,
    whatPeopleAreSaying:
      theme.whatPeopleAreSaying ??
      `People repeatedly discuss ${theme.name.toLowerCase()} with concrete examples and strong reactions.`,
    narrative: theme.narrative ?? inferNarrative(theme),
    signalStrength:
      theme.signalStrength ?? (theme.volume >= 3 ? "strong" : "weak"),
    whyItMatters:
      theme.whyItMatters ??
      "This pattern influences user trust, conversion, and long-term retention behavior.",
    implication:
      theme.implication ??
      "Teams that solve this with focused execution can capture outsized attention and demand.",
    actionLayer:
      theme.actionLayer ??
      "Prioritize one testable response for this theme within the next product or content sprint.",
  }));
};

const enrichOpportunityDetail = (
  opportunities: AnalysisResult["opportunities"],
): AnalysisResult["opportunities"] => {
  return opportunities.map((opportunity) => ({
    ...opportunity,
    whyNow:
      opportunity.whyNow ??
      "Discussion volume and urgency are high enough to support near-term demand validation.",
    executionIdea:
      opportunity.executionIdea ??
      "Ship a narrow MVP aimed at this pain point and validate through communities already discussing it.",
    audience:
      opportunity.audience ?? "Operators, creators, and buyers actively discussing this topic.",
  }));
};

const enrichContrarianDetail = (
  insights: AnalysisResult["contrarianInsights"],
): AnalysisResult["contrarianInsights"] => {
  return insights.map((insight) => ({
    ...insight,
    crowdBelief:
      insight.crowdBelief ?? "The mainstream assumption reflects the loudest posts, not the full signal set.",
    whyCrowdMayBeWrong:
      insight.whyCrowdMayBeWrong ??
      "High-engagement edge cases indicate the dominant narrative misses execution-level realities.",
  }));
};

const inferDataQualityNote = (items: DiscussionItem[]): string => {
  if (items.length < 15) {
    return "Dataset quality is moderate-to-weak: limited clean signals, so conclusions should be validated with additional runs.";
  }

  const uniquePlatforms = new Set(items.map((item) => item.platform));
  if (uniquePlatforms.size < 2) {
    return "Dataset quality is moderate: signal mostly comes from one platform, which can bias theme distribution.";
  }

  return "Dataset quality is strong enough for directional decisions: multiple sources with repeated high-signal claims.";
};

const normalizeExecutiveBullets = (
  executiveSummary: AnalysisResult["executiveSummary"],
): AnalysisResult["executiveSummary"] => {
  const bullets = (executiveSummary.bullets ?? [])
    .map((bullet) => bullet.trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    ...executiveSummary,
    bullets,
  };
};

const normalizeSummary = (analysis: AnalysisResult): AnalysisResult => {
  return {
    ...analysis,
    executiveSummary: normalizeExecutiveBullets(analysis.executiveSummary),
    keyThemes: enrichThemeDetail(analysis.keyThemes),
    opportunities: enrichOpportunityDetail(analysis.opportunities),
    contrarianInsights: enrichContrarianDetail(analysis.contrarianInsights),
    contentIdeas: analysis.contentIdeas,
    dataQualityNote:
      analysis.dataQualityNote ??
      "Dataset quality could not be fully assessed. Re-run analysis with more source coverage.",
  };
};

const withDerivedDataQualityNote = (
  analysis: AnalysisResult,
  items: DiscussionItem[],
): AnalysisResult => {
  return {
    ...analysis,
    dataQualityNote: analysis.dataQualityNote ?? inferDataQualityNote(items),
  };
};

const buildBaseAnalysis = (
  topic: string,
  items: DiscussionItem[],
  keyThemes: AnalysisResult["keyThemes"],
  platformBreakdown: AnalysisResult["platformBreakdown"],
  trends: AnalysisResult["trends"],
  opportunities: AnalysisResult["opportunities"],
  contrarianInsights: AnalysisResult["contrarianInsights"],
  contentIdeas: AnalysisResult["contentIdeas"],
  executiveSummary: AnalysisResult["executiveSummary"],
  sentimentOverview: AnalysisResult["sentimentOverview"],
): AnalysisResult => {
  return {
    topic,
    generatedAt: new Date().toISOString(),
    fromCache: false,
    totalSignals: items.length,
    executiveSummary,
    keyThemes,
    platformBreakdown,
    trends,
    opportunities,
    contrarianInsights,
    contentIdeas,
    sentimentOverview,
    sampleSources: pickSampleSources(items),
    dataQualityNote: inferDataQualityNote(items),
  };
};

export const runAnalysisPipeline = async (topic: string): Promise<AnalysisResult> => {
  const expandedQueries = expandQueries(topic);
  const retrieved = await fetchDiscussions(topic, expandedQueries);
  const filtered = filterNoise(retrieved);
  const annotated = annotateSentiment(filtered);

  const sentimentOverview = summarizeSentiment(annotated);
  const keyThemes = clusterThemes(annotated, topic);
  const platformBreakdown = buildPlatformBreakdown(annotated);
  const trends = deriveTrends(keyThemes, annotated);
  const opportunities = deriveOpportunities(topic, keyThemes, trends, sentimentOverview);
  const contrarianInsights = deriveContrarianInsights(topic, annotated, keyThemes);
  const contentIdeas = deriveContentIdeas(topic, keyThemes, opportunities);
  const executiveSummary = buildExecutiveSummary(
    topic,
    annotated.length,
    keyThemes,
    sentimentOverview,
    trends,
  );

  let analysis = buildBaseAnalysis(
    topic,
    annotated,
    keyThemes,
    platformBreakdown,
    trends,
    opportunities,
    contrarianInsights,
    contentIdeas,
    executiveSummary,
    sentimentOverview,
  );

  const aiEnhancements = await generateAiEnhancements({
    topic,
    fallback: analysis,
    topSignals: annotated,
    expandedQueries,
  });

  if (aiEnhancements) {
    analysis = {
      ...analysis,
      executiveSummary: aiEnhancements.executiveSummary ?? analysis.executiveSummary,
      keyThemes:
        aiEnhancements.keyThemes && aiEnhancements.keyThemes.length > 0
          ? aiEnhancements.keyThemes.slice(0, 8)
          : analysis.keyThemes,
      trends:
        aiEnhancements.trends && aiEnhancements.trends.length > 0
          ? aiEnhancements.trends.slice(0, 5)
          : analysis.trends,
      opportunities:
        aiEnhancements.opportunities && aiEnhancements.opportunities.length > 0
          ? aiEnhancements.opportunities.slice(0, 4)
          : analysis.opportunities,
      contrarianInsights:
        aiEnhancements.contrarianInsights && aiEnhancements.contrarianInsights.length > 0
          ? aiEnhancements.contrarianInsights.slice(0, 4)
          : analysis.contrarianInsights,
      contentIdeas:
        aiEnhancements.contentIdeas && aiEnhancements.contentIdeas.length > 0
          ? aiEnhancements.contentIdeas.slice(0, 10)
          : analysis.contentIdeas,
      dataQualityNote: aiEnhancements.dataQualityNote ?? analysis.dataQualityNote,
    };
  }

  return normalizeSummary(withDerivedDataQualityNote(analysis, annotated));
};
