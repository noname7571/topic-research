import OpenAI from "openai";

import { scoreSentiment, sentimentFromScore } from "@/lib/pipeline/sentiment";
import { APP_CONFIG, API_KEYS } from "@/lib/config";
import { AnalysisResult, DiscussionItem, NarrativeLabel } from "@/lib/types";

const client = API_KEYS.openAi
  ? new OpenAI({
      apiKey: API_KEYS.openAi,
    })
  : null;

const parseJson = <T,>(input: string): T | null => {
  try {
    return JSON.parse(input) as T;
  } catch {
    const match = input.match(/\{[\s\S]*\}/);
    if (!match) {
      return null;
    }

    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
};

export interface AiEnhancement {
  executiveSummary?: AnalysisResult["executiveSummary"];
  keyThemes?: AnalysisResult["keyThemes"];
  trends?: AnalysisResult["trends"];
  opportunities?: AnalysisResult["opportunities"];
  contrarianInsights?: AnalysisResult["contrarianInsights"];
  contentIdeas?: AnalysisResult["contentIdeas"];
  dataQualityNote?: string;
}

interface AiInput {
  topic: string;
  fallback: AnalysisResult;
  topSignals: DiscussionItem[];
  expandedQueries: string[];
}

interface StructuredContentIdea {
  title: string;
  format: "youtube" | "twitter" | "tiktok";
  hook: string;
  angle?: string;
}

interface StructuredOpportunity {
  title: string;
  rationale: string;
  confidence?: number;
}

interface StructuredGenerationOutput {
  answer: string;
  themes: string[];
  insights: string[];
  contentIdeas: Array<StructuredContentIdea | string>;
  opportunities: Array<StructuredOpportunity | string>;
  confidence: number | string;
}

const sanitizeRawSignal = (text: string): string => {
  return text
    .replace(/#[^\s]+/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const tokenize = (value: string): string[] => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
};

const toTokenSet = (value: string): Set<string> => {
  return new Set(tokenize(value));
};

const buildQueryTokens = (topic: string, expandedQueries: string[]): Set<string> => {
  return new Set(tokenize([topic, ...expandedQueries].join(" ")));
};

const keywordMatchScore = (text: string, queryTokens: Set<string>): number => {
  if (queryTokens.size === 0) {
    return 0;
  }

  const textTokens = toTokenSet(text);
  let matches = 0;

  for (const token of queryTokens) {
    if (textTokens.has(token)) {
      matches += 1;
    }
  }

  return (matches / Math.min(10, queryTokens.size)) * 70;
};

const semanticSimilarityScore = (text: string, expandedQueries: string[]): number => {
  const textTokens = toTokenSet(text);
  if (textTokens.size === 0 || expandedQueries.length === 0) {
    return 0;
  }

  let best = 0;
  for (const query of expandedQueries) {
    const queryTokens = toTokenSet(query);
    if (queryTokens.size === 0) {
      continue;
    }

    let intersection = 0;
    for (const token of textTokens) {
      if (queryTokens.has(token)) {
        intersection += 1;
      }
    }

    const union = new Set([...textTokens, ...queryTokens]).size;
    const similarity = union > 0 ? intersection / union : 0;
    if (similarity > best) {
      best = similarity;
    }
  }

  return best * 30;
};

const buildRawDataBlock = (
  signals: DiscussionItem[],
  topic: string,
  expandedQueries: string[],
): {
  rawData: string;
  relevanceStats: {
    totalRows: number;
    relevantRows: number;
    irrelevantRatio: number;
    dataQualityIsWeak: boolean;
  };
} => {
  const queryTokens = buildQueryTokens(topic, expandedQueries);
  const relevanceThreshold = APP_CONFIG.relevanceMinScore;
  const maxRows = Math.min(APP_CONFIG.maxSignalsPerRun, APP_CONFIG.relevanceMaxKept, 80);

  const candidateRows = signals.slice(0, 80).map((signal) => {
    const text = `${signal.title} | ${signal.snippet}`;
    const keywordScore = keywordMatchScore(text, queryTokens);
    const semanticScore = semanticSimilarityScore(text, expandedQueries);
    const relevanceScore = keywordScore + semanticScore;

    return {
      signal,
      relevanceScore,
      content: sanitizeRawSignal(text),
    };
  });

  const relevantRows = candidateRows
    .filter(
      (row) =>
        row.content.length >= 50 && row.relevanceScore >= relevanceThreshold,
    )
    .sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) {
        return right.relevanceScore - left.relevanceScore;
      }

      return right.signal.engagement - left.signal.engagement;
    })
    .slice(0, maxRows);

  const totalRows = candidateRows.length;
  const relevantCount = relevantRows.length;
  const irrelevantRatio = totalRows > 0 ? (totalRows - relevantCount) / totalRows : 0;
  const dataQualityIsWeak =
    relevantCount < APP_CONFIG.weakDataMinRelevantRows || irrelevantRatio > 0.35;

  if (relevantRows.length === 0) {
    return {
      rawData: "No high-quality rows remained after relevance filtering.",
      relevanceStats: {
        totalRows,
        relevantRows: relevantCount,
        irrelevantRatio,
        dataQualityIsWeak: true,
      },
    };
  }

  const rawData = relevantRows
    .map((row, index) => {
      const signal = row.signal;
      return (
        `${index + 1}. [source=${signal.platform} | publisher=${signal.source}] ` +
        `${row.content} | engagement=${signal.engagement} | relevance=${row.relevanceScore.toFixed(1)}`
      );
    })
    .join("\n");

  return {
    rawData,
    relevanceStats: {
      totalRows,
      relevantRows: relevantCount,
      irrelevantRatio,
      dataQualityIsWeak,
    },
  };
};

const normalizeConfidence = (
  value: number | string,
  fallback: number,
): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  if (Number.isFinite(parsed)) {
    return Math.max(0, Math.min(100, Math.round(parsed)));
  }

  return fallback;
};

const calibrateConfidence = (
  baseConfidence: number,
  relevanceStats: {
    totalRows: number;
    relevantRows: number;
    irrelevantRatio: number;
    dataQualityIsWeak: boolean;
  },
  signals: DiscussionItem[],
  themesCount: number,
  insightsCount: number,
): number => {
  const sourceDiversity = new Set(signals.map((signal) => signal.platform)).size;
  const relevanceRatio =
    relevanceStats.totalRows > 0
      ? relevanceStats.relevantRows / relevanceStats.totalRows
      : 0;

  let adjustment = 0;
  adjustment += sourceDiversity >= 3 ? 7 : sourceDiversity === 2 ? 3 : -4;
  adjustment += relevanceRatio >= 0.7 ? 6 : relevanceRatio >= 0.5 ? 2 : -6;
  adjustment += themesCount >= 5 ? 4 : themesCount >= 3 ? 1 : -5;
  adjustment += insightsCount >= 5 ? 4 : insightsCount >= 3 ? 1 : -4;

  if (relevanceStats.dataQualityIsWeak) {
    adjustment -= 10;
  }

  return Math.max(
    APP_CONFIG.confidenceMin,
    Math.min(APP_CONFIG.confidenceMax, Math.round(baseConfidence + adjustment)),
  );
};

const inferNarrative = (text: string): NarrativeLabel => {
  const normalized = text.toLowerCase();
  if (/fear|risk|danger|unsafe|problem|decline/.test(normalized)) {
    return "fear";
  }
  if (/hype|viral|craze|fomo|explosive|boom/.test(normalized)) {
    return "hype";
  }
  if (/opportunity|gap|demand|build|growth/.test(normalized)) {
    return "opportunity";
  }
  return "confusion";
};

const mapContentIdeas = (
  rawIdeas: Array<StructuredContentIdea | string>,
): AnalysisResult["contentIdeas"] => {
  return rawIdeas
    .map((idea) => {
      if (typeof idea === "string") {
        return {
          title: idea.slice(0, 120),
          format: "twitter" as const,
          hook: idea,
          angle: "Angle not provided.",
        };
      }

      return {
        title: idea.title,
        format: idea.format,
        hook: idea.hook,
        angle: idea.angle ?? "Use clear proof points and practical outcomes.",
      };
    })
    .filter((idea) => idea.title.trim().length > 0)
    .slice(0, 10);
};

const mapOpportunities = (
  rawOpportunities: Array<StructuredOpportunity | string>,
): AnalysisResult["opportunities"] => {
  return rawOpportunities
    .map((item) => {
      if (typeof item === "string") {
        return {
          title: item.slice(0, 120),
          rationale: item,
          confidence: 70,
        };
      }

      return {
        title: item.title,
        rationale: item.rationale,
        confidence: Number.isFinite(item.confidence)
          ? Math.max(0, Math.min(100, Math.round(item.confidence as number)))
          : 72,
      };
    })
    .filter((item) => item.title.trim().length > 0)
    .slice(0, 6);
};

const mapThemes = (
  rawThemes: string[],
  rawInsights: string[],
): AnalysisResult["keyThemes"] => {
  return rawThemes
    .map((theme, index) => {
      const insight = rawInsights[index] ?? rawInsights[0] ?? "Signal is still forming for this theme.";
      const sentimentScore = scoreSentiment(`${theme} ${insight}`);

      return {
        name: theme,
        summary: insight,
        sentiment: sentimentFromScore(sentimentScore),
        volume: Math.max(1, 8 - index),
        signalExamples: [insight.slice(0, 150)],
        narrative: inferNarrative(`${theme} ${insight}`),
        whatPeopleAreSaying: insight,
        signalStrength: index < 4 ? "strong" : "weak",
        whyItMatters: "This pattern affects conversion quality, trust, and go-to-market performance.",
        implication: "Teams that respond early can compound distribution and product positioning advantages.",
        actionLayer: "Turn this into one testable messaging or product experiment this week.",
      } satisfies AnalysisResult["keyThemes"][number];
    })
    .filter((theme) => theme.name.trim().length > 0)
    .slice(0, 7);
};

const mapContrarianInsights = (
  rawInsights: string[],
): AnalysisResult["contrarianInsights"] => {
  const contrarianCandidates = rawInsights.filter((insight) =>
    /(crowd|contrarian|overhyped|non-obvious|wrong|mispriced|consensus)/i.test(insight),
  );

  return contrarianCandidates
    .slice(0, 4)
    .map((insight) => ({
      title: insight.length > 120 ? `${insight.slice(0, 117)}...` : insight,
      rationale: insight,
      supportingSignal: "Derived from high-relevance cross-source evidence.",
      crowdBelief: "The loudest narrative appears complete.",
      whyCrowdMayBeWrong:
        "Cross-source signals indicate the visible consensus misses execution-level constraints.",
    }));
};

const mapStructuredOutputToEnhancement = (
  output: StructuredGenerationOutput,
  relevanceStats: {
    totalRows: number;
    relevantRows: number;
    irrelevantRatio: number;
    dataQualityIsWeak: boolean;
  },
  fallback: AnalysisResult,
  signals: DiscussionItem[],
): AiEnhancement => {
  const answer = output.answer?.trim() || fallback.executiveSummary.summary;
  const themes = Array.isArray(output.themes)
    ? output.themes.map((theme) => String(theme).trim()).filter(Boolean)
    : [];
  const insights = Array.isArray(output.insights)
    ? output.insights.map((insight) => String(insight).trim()).filter(Boolean)
    : [];

  const baseConfidence = normalizeConfidence(
    output.confidence,
    fallback.executiveSummary.confidence,
  );

  const keyThemes = mapThemes(themes, insights);
  const opportunities = mapOpportunities(output.opportunities ?? []);
  const contentIdeas = mapContentIdeas(output.contentIdeas ?? []);
  const contrarianInsights = mapContrarianInsights(insights);
  const confidence = calibrateConfidence(
    baseConfidence,
    relevanceStats,
    signals,
    keyThemes.length,
    insights.length,
  );

  const bullets = insights.length > 0
    ? insights.slice(0, 6)
    : fallback.executiveSummary.bullets.slice(0, 6);

  const sourceDiversity = new Set(signals.map((signal) => signal.platform)).size;
  const dataQualityNote = relevanceStats.dataQualityIsWeak
    ? "Data quality is moderate-to-weak after relevance filtering. Validate critical decisions with additional runs."
    : `Data quality is strong: ${relevanceStats.relevantRows}/${relevanceStats.totalRows} rows remained relevant after filtering across ${sourceDiversity} source types.`;

  return {
    executiveSummary: {
      headline: keyThemes[0]?.name ?? fallback.executiveSummary.headline,
      summary: answer,
      bullets,
      confidence,
    },
    keyThemes: keyThemes.length > 0 ? keyThemes : fallback.keyThemes,
    opportunities: opportunities.length > 0 ? opportunities : fallback.opportunities,
    contrarianInsights:
      contrarianInsights.length > 0 ? contrarianInsights : fallback.contrarianInsights,
    contentIdeas: contentIdeas.length > 0 ? contentIdeas : fallback.contentIdeas,
    dataQualityNote,
  };
};

export const generateAiEnhancements = async (
  input: AiInput,
): Promise<AiEnhancement | null> => {
  if (!client) {
    return null;
  }

  const { rawData, relevanceStats } = buildRawDataBlock(
    input.topSignals,
    input.topic,
    input.expandedQueries,
  );

  const systemPrompt = `You are an expert analyst and researcher.

You must:
- answer the user's question directly
- analyze real discussions
- extract insights

Do NOT summarize blindly.`;

  const userPrompt = `INPUT:
Query: ${input.topic}
Data: ${rawData}

STEP 1: Answer the question clearly and practically

STEP 2: Extract 5-7 REAL themes
- themes must be ideas, not keywords

STEP 3: Generate insights
- what people believe
- what it means
- why it matters

STEP 4: Generate content ideas
- YouTube, TikTok, Twitter
- must be specific and clickable

STEP 5: Generate opportunities
- business ideas
- tools
- gaps in the market

RULES:
- remove noise
- ignore weak data
- avoid generic statements

OUTPUT STRUCTURE (JSON ONLY):
{
  "answer": "",
  "themes": [],
  "insights": [],
  "contentIdeas": [],
  "opportunities": [],
  "confidence": ""
}`;

  try {
    const response = await client.chat.completions.create({
      model: APP_CONFIG.openAiModel,
      temperature: APP_CONFIG.openAiTemperature,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return null;
    }

    const parsed = parseJson<StructuredGenerationOutput>(content);
    if (!parsed) {
      return null;
    }

      return mapStructuredOutputToEnhancement(
        parsed,
        relevanceStats,
        input.fallback,
        input.topSignals,
      );
  } catch {
    return null;
  }
};
