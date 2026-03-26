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

const cleanData = (data: string[]): string[] => {
  return data
    .filter((item) => item.length > 50)
    .filter((item) => !item.includes("#"))
    .map((item) => item.replace(/https?:\/\/\S+/g, ""));
};

const buildRawDataBlock = (signals: DiscussionItem[]): string => {
  const candidateRows = signals.slice(0, 100).map((signal) => {
    return `[${signal.platform}] ${signal.title} | ${signal.snippet} | engagement=${signal.engagement}`;
  });

  const cleanedRows = cleanData(candidateRows).map((row) => sanitizeRawSignal(row));
  if (cleanedRows.length === 0) {
    return "No high-quality rows remained after preprocessing.";
  }

  return cleanedRows
    .map((row, index) => `${index + 1}. ${row}`)
    .join("\n");
};

export const generateAiEnhancements = async (
  input: AiInput,
): Promise<AiEnhancement | null> => {
  if (!client) {
    return null;
  }

  const systemPrompt = `You are a senior internet analyst.

Your task is to analyze REAL online discourse and extract HIGH-SIGNAL insights.

You are NOT allowed to:
- summarize blindly
- repeat input text
- generate generic statements

You MUST think critically and filter aggressively.

Required process:
1) Data cleaning: remove spam, hashtags, emojis, low-information content, duplicate ideas.
2) Signal filtering: keep only strong opinions, repeated ideas, specific claims/problems.
3) Theme extraction: 5-8 meaningful idea-level themes. Never output single-word themes.
4) Cross-source validation: mark each theme as strong or weak.
5) Insight generation: what people say, why it matters, what it implies.
6) Opportunities: specific content/business/gap opportunities.
7) Contrarian insights: where crowd assumptions may be wrong.
8) Use web knowledge to validate/enrich weak datasets while avoiding hallucinations.

Output must be JSON only and follow the schema exactly.`;

  const rawData = buildRawDataBlock(input.topSignals);

  const userPrompt = `INPUT\n=====\n\nTopic: ${input.topic}\n\nCollected data:\n${rawData}\n\nExpanded queries used:\n${input.expandedQueries.join(", ")}\n\nFallback analysis context:\n${JSON.stringify(
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
      "whatPeopleAreSaying": "concrete statement",
      "signalStrength": "strong|weak",
      "whyItMatters": "specific impact",
      "implication": "trend/behavior/opportunity implication"
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

    return parseJson<AiEnhancement>(content);
  } catch {
    return null;
  }
};
