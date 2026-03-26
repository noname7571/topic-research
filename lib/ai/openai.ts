import OpenAI from "openai";

import { APP_CONFIG, API_KEYS } from "@/lib/config";
import { AnalysisResult, DiscussionItem } from "@/lib/types";

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

const sanitizeRawSignal = (text: string): string => {
  return text
    .replace(/#[^\s]+/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const filterRelevantData = (data: string[], topic: string): string[] => {
  const keywords = topic
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 1);

  if (keywords.length === 0) {
    return data;
  }

  return data.filter((item) => {
    const text = item.toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
  });
};

const cleanData = (data: string[]): string[] => {
  return data
    .filter((item) => item.length > 50)
    .filter((item) => !item.trim().startsWith("#"))
    .map((item) => item.replace(/https?:\/\/\S+/g, ""))
    .map((item) => item.trim())
    .filter(Boolean);
};

const buildRawDataBlock = (
  signals: DiscussionItem[],
  topic: string,
): {
  rawData: string;
  relevanceStats: {
    totalRows: number;
    relevantRows: number;
    irrelevantRatio: number;
    dataQualityIsWeak: boolean;
  };
} => {
  const candidateRows = signals.slice(0, 100).map((signal) => {
    return `[${signal.platform}] ${signal.title} | ${signal.snippet} | engagement=${signal.engagement}`;
  });

  const relevantRows = filterRelevantData(candidateRows, topic);
  const rowsToClean = relevantRows.length > 0 ? relevantRows : candidateRows;
  const cleanedRows = cleanData(rowsToClean).map((row) => sanitizeRawSignal(row));

  const totalRows = candidateRows.length;
  const relevantCount = relevantRows.length;
  const irrelevantRatio =
    totalRows > 0 ? (totalRows - relevantCount) / totalRows : 0;
  const dataQualityIsWeak = irrelevantRatio > 0.3;

  if (cleanedRows.length === 0) {
    return {
      rawData: "No high-quality rows remained after preprocessing.",
      relevanceStats: {
        totalRows,
        relevantRows: relevantCount,
        irrelevantRatio,
        dataQualityIsWeak: true,
      },
    };
  }

  return {
    rawData: cleanedRows
      .map((row, index) => `${index + 1}. ${row}`)
      .join("\n"),
    relevanceStats: {
      totalRows,
      relevantRows: relevantCount,
      irrelevantRatio,
      dataQualityIsWeak,
    },
  };
};

export const generateAiEnhancements = async (
  input: AiInput,
): Promise<AiEnhancement | null> => {
  if (!client) {
    return null;
  }

  const systemPrompt = `You are an expert analyst, investor, and internet researcher.

Your job is to do BOTH:
1) Answer the user query directly with real knowledge.
2) Analyze how the internet is discussing the topic.

If the direct answer is unclear, generic, or non-practical, the output is incorrect.

STRICT RULES:
- No generic filler.
- No meaningless themes.
- Ignore weak/noisy data.
- Prioritize clarity and usefulness.

STEP 0: Validate data relevance.
- Remove unrelated content, spam, and weak rows.
- If more than 30% of data is irrelevant, explicitly mark: data quality is weak.

STEP 1: Direct answer first.
- Provide a clear, practical, specific answer.

STEP 2-4: Discourse analysis.
- Extract 5-7 full-idea themes from real discussions.
- Mark signal strength and ignore weak themes.
- Explain what people are saying, what it means, and why it matters.

STEP 5: Content ideas.
- Generate specific high-quality hooks for YouTube, Twitter threads, and TikTok.

STEP 6: Opportunities.
- Generate business, tool, and product ideas from real pain points.

STEP 7: Contrarian insights.
- Identify where the crowd is wrong or overhyped.

Return JSON only and follow the schema exactly.`;

  const { rawData, relevanceStats } = buildRawDataBlock(input.topSignals, input.topic);
  const relevanceSummary =
    relevanceStats.dataQualityIsWeak || relevanceStats.relevantRows === 0
      ? "data quality is weak"
      : "data quality is acceptable";

  const userPrompt = `INPUT\n=====\n\nUser Query: ${input.topic}\n\nCollected Data:\n${rawData}\n\nExpanded queries used:\n${input.expandedQueries.join(", ")}\n\nPreprocessing and relevance gate (already applied):\n- Total rows: ${relevanceStats.totalRows}\n- Relevant rows: ${relevanceStats.relevantRows}\n- Irrelevant ratio: ${(relevanceStats.irrelevantRatio * 100).toFixed(1)}%\n- Relevance status: ${relevanceSummary}\n\nFallback analysis context:\n${JSON.stringify(
    {
      executiveSummary: input.fallback.executiveSummary,
      topThemes: input.fallback.keyThemes.slice(0, 3),
      trends: input.fallback.trends.slice(0, 3),
      sentimentOverview: input.fallback.sentimentOverview,
    },
    null,
    2,
  )}\n\nOutput schema:\n{
  "executiveSummary": {
    "headline": "string",
    "summary": "string",
    "bullets": ["5-8 sharp bullets"],
    "confidence": "number 0-100"
  },
  "keyThemes": [
    {
      "name": "clear theme title sentence",
      "summary": "short synthesis",
      "sentiment": "positive|neutral|negative",
      "volume": "number",
      "signalExamples": ["brief evidence phrase"],
      "narrative": "hype|fear|opportunity|confusion",
      "whatPeopleAreSaying": "concrete statement",
      "signalStrength": "strong|weak",
      "whyItMatters": "specific impact",
      "implication": "trend/behavior/opportunity implication",
      "actionLayer": "what to do with this insight"
    }
  ],
  "trends": [
    {
      "name": "trend name",
      "direction": "rising|falling|stable",
      "signalStrength": "number 1-100",
      "reason": "specific evidence-backed reason"
    }
  ],
  "opportunities": [
    {
      "title": "specific actionable idea",
      "rationale": "why this solves real pain",
      "confidence": "number 0-100",
      "whyNow": "why timing is right",
      "executionIdea": "concrete execution format",
      "audience": "who this is for"
    }
  ],
  "contrarianInsights": [
    {
      "title": "non-obvious conclusion",
      "rationale": "analysis explanation",
      "supportingSignal": "supporting signal from discourse",
      "crowdBelief": "what most people assume",
      "whyCrowdMayBeWrong": "specific counter-logic"
    }
  ],
  "contentIdeas": [
    {
      "title": "specific idea title",
      "format": "youtube|twitter|tiktok",
      "hook": "clear hook",
      "angle": "execution angle"
    }
  ],
  "dataQualityNote": "dataset quality assessment"
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

    const parsed = parseJson<AiEnhancement>(content);
    if (!parsed) {
      return null;
    }

    if (relevanceStats.dataQualityIsWeak && !parsed.dataQualityNote) {
      parsed.dataQualityNote = "data quality is weak";
    }

    return parsed;
  } catch {
    return null;
  }
};
