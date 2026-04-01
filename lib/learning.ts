import { SupabaseClient } from "@supabase/supabase-js";

import { APP_CONFIG } from "@/lib/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import { AnalysisResult, DiscussionItem } from "@/lib/types";

type TypedSupabaseClient = SupabaseClient<Database>;
type InteractionRow = Database["public"]["Tables"]["analysis_interactions"]["Row"];
type RetrievalMemoryScoreRow = Pick<
  Database["public"]["Tables"]["retrieval_memories"]["Row"],
  "id" | "topic" | "normalized_topic" | "memory_summary" | "confidence" | "approved_at" | "created_at"
>;

interface InteractionCompletionPayload {
  fromCache: boolean;
  memoryItemsUsed: number;
}

interface FeedbackPayload {
  approved: boolean;
  note?: string;
  labels?: string[];
}

const normalizeTopic = (topic: string): string => {
  return topic
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

const topicTokens = (topic: string): string[] => {
  return normalizeTopic(topic)
    .split(/\s+/)
    .filter((token) => token.length > 2);
};

const toJson = (value: unknown): Json => {
  return JSON.parse(JSON.stringify(value ?? null)) as Json;
};

const asJsonObject = (value: Json | null): Record<string, Json> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, Json>;
};

const asStringArray = (value: Json | undefined, maxItems: number): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
};

const scoreMemory = (
  memory: RetrievalMemoryScoreRow,
  normalizedTopic: string,
  tokens: string[],
): number => {
  let score = 0;

  if (memory.normalized_topic === normalizedTopic) {
    score += 60;
  }

  if (memory.normalized_topic.includes(normalizedTopic) || normalizedTopic.includes(memory.normalized_topic)) {
    score += 20;
  }

  const memoryTokens = new Set(topicTokens(memory.normalized_topic));
  const overlap = tokens.filter((token) => memoryTokens.has(token)).length;
  if (tokens.length > 0) {
    score += Math.round((overlap / tokens.length) * 35);
  }

  const ageDays = Math.max(
    0,
    (Date.now() - new Date(memory.approved_at ?? memory.created_at).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  score += Math.max(0, 10 - Math.floor(ageDays / 7));

  score += Math.round((Math.max(0, Math.min(100, memory.confidence)) / 100) * 10);
  return score;
};

const extractAnalysisMemory = (
  interaction: Pick<InteractionRow, "topic" | "normalized_topic" | "analysis_payload">,
): {
  topic: string;
  normalizedTopic: string;
  summary: string;
  confidence: number;
  payload: Json;
} => {
  const analysis = asJsonObject(interaction.analysis_payload);
  const executiveSummary = asJsonObject((analysis?.executiveSummary as Json | undefined) ?? null);
  const summary =
    typeof executiveSummary?.summary === "string"
      ? executiveSummary.summary.trim()
      : `Approved analysis for ${interaction.topic}.`;

  const confidenceRaw = executiveSummary?.confidence;
  const confidence =
    typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(100, Math.round(confidenceRaw)))
      : 65;

  const bullets = asStringArray(executiveSummary?.bullets, 4);

  const keyThemes = Array.isArray(analysis?.keyThemes)
    ? analysis.keyThemes
        .slice(0, 5)
        .map((item) => {
          const value = asJsonObject(item as Json);
          if (!value || typeof value.name !== "string") {
            return null;
          }

          return {
            name: value.name,
            summary: typeof value.summary === "string" ? value.summary : "",
          };
        })
        .filter((item): item is { name: string; summary: string } => item !== null)
    : [];

  const opportunities = Array.isArray(analysis?.opportunities)
    ? analysis.opportunities
        .slice(0, 4)
        .map((item) => {
          const value = asJsonObject(item as Json);
          return value && typeof value.title === "string" ? value.title : null;
        })
        .filter((item): item is string => item !== null)
    : [];

  const sampleSources = Array.isArray(analysis?.sampleSources)
    ? analysis.sampleSources
        .slice(0, 8)
        .map((item) => {
          const value = asJsonObject(item as Json);
          if (
            !value ||
            typeof value.title !== "string" ||
            typeof value.url !== "string" ||
            typeof value.platform !== "string"
          ) {
            return null;
          }

          return {
            title: value.title,
            url: value.url,
            platform: value.platform,
          };
        })
        .filter(
          (item): item is { title: string; url: string; platform: string } => item !== null,
        )
    : [];

  const summaryText = [
    summary,
    bullets.length > 0 ? `Key points: ${bullets.join(" | ")}` : "",
    keyThemes.length > 0
      ? `Themes: ${keyThemes.map((item) => item.name).join(", ")}`
      : "",
    opportunities.length > 0
      ? `Opportunities: ${opportunities.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 1200);

  const payload = toJson({
    topic: interaction.topic,
    normalizedTopic: interaction.normalized_topic,
    executiveSummary: summary,
    confidence,
    bullets,
    keyThemes,
    opportunities,
    sampleSources,
  });

  return {
    topic: interaction.topic,
    normalizedTopic: interaction.normalized_topic,
    summary: summaryText || summary,
    confidence,
    payload,
  };
};

export const startAnalysisInteraction = async (
  supabase: TypedSupabaseClient,
  userId: string,
  topic: string,
  requestPayload: Record<string, unknown>,
): Promise<string | null> => {
  const normalizedTopic = normalizeTopic(topic);

  const { data, error } = await supabase
    .from("analysis_interactions")
    .insert({
      user_id: userId,
      topic: topic.trim(),
      normalized_topic: normalizedTopic,
      request_payload: toJson(requestPayload),
      status: "pending",
      feedback_labels: [],
    })
    .select("id")
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.id ?? null;
};

export const completeAnalysisInteraction = async (
  supabase: TypedSupabaseClient,
  userId: string,
  interactionId: string,
  analysis: AnalysisResult,
  completionPayload: InteractionCompletionPayload,
): Promise<void> => {
  await supabase
    .from("analysis_interactions")
    .update({
      status: "completed",
      source_count: analysis.totalSignals,
      analysis_payload: toJson(analysis),
      retrieval_payload: toJson(completionPayload),
      completed_at: new Date().toISOString(),
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", interactionId)
    .eq("user_id", userId);
};

export const failAnalysisInteraction = async (
  supabase: TypedSupabaseClient,
  userId: string,
  interactionId: string,
  errorMessage: string,
): Promise<void> => {
  await supabase
    .from("analysis_interactions")
    .update({
      status: "failed",
      error_message: errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", interactionId)
    .eq("user_id", userId);
};

export const fetchRetrievalMemoryItems = async (
  supabase: TypedSupabaseClient,
  userId: string,
  topic: string,
): Promise<DiscussionItem[]> => {
  const normalizedTopic = normalizeTopic(topic);
  const tokens = topicTokens(normalizedTopic);

  const { data, error } = await supabase
    .from("retrieval_memories")
    .select("id, topic, normalized_topic, memory_summary, confidence, approved_at, created_at")
    .eq("user_id", userId)
    .order("approved_at", { ascending: false })
    .limit(APP_CONFIG.retrievalMemoryCandidateLimit);

  if (error || !data || data.length === 0) {
    return [];
  }

  const selected = data
    .map((memory) => ({
      memory,
      score: scoreMemory(memory, normalizedTopic, tokens),
    }))
    .filter((item) => item.score >= APP_CONFIG.retrievalMemoryMinScore)
    .sort((left, right) => right.score - left.score)
    .slice(0, APP_CONFIG.retrievalMemoryInjectLimit);

  return selected.map(({ memory, score }) => ({
    id: `memory-${memory.id}`,
    platform: "web",
    title: `Approved memory signal: ${memory.topic}`,
    snippet: memory.memory_summary,
    url: `${APP_CONFIG.appUrl}/dashboard?memory=${memory.id}`,
    publishedAt: memory.approved_at ?? memory.created_at,
    engagement: Math.max(80, memory.confidence * 4 + score),
    source: "Approved feedback memory",
    queryUsed: topic,
  }));
};

export const submitAnalysisFeedback = async (
  supabase: TypedSupabaseClient,
  userId: string,
  interactionId: string,
  payload: FeedbackPayload,
): Promise<{ updated: boolean; memoryUpdated: boolean }> => {
  const { data: interaction, error } = await supabase
    .from("analysis_interactions")
    .select("id, user_id, topic, normalized_topic, analysis_payload")
    .eq("id", interactionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !interaction) {
    return {
      updated: false,
      memoryUpdated: false,
    };
  }

  const note = payload.note?.trim();
  const labels = payload.labels?.filter((item) => item.trim().length > 0) ?? [];

  await supabase
    .from("analysis_interactions")
    .update({
      approved: payload.approved,
      feedback_note: note && note.length > 0 ? note : null,
      feedback_labels: labels,
      updated_at: new Date().toISOString(),
    })
    .eq("id", interactionId)
    .eq("user_id", userId);

  if (!payload.approved) {
    return {
      updated: true,
      memoryUpdated: false,
    };
  }

  const memory = extractAnalysisMemory(interaction);

  const { error: memoryError } = await supabase.from("retrieval_memories").upsert(
    {
      user_id: userId,
      interaction_id: interactionId,
      topic: memory.topic,
      normalized_topic: memory.normalizedTopic,
      memory_summary: memory.summary,
      confidence: memory.confidence,
      memory_payload: memory.payload,
      approved_at: new Date().toISOString(),
    },
    {
      onConflict: "interaction_id",
    },
  );

  return {
    updated: true,
    memoryUpdated: !memoryError,
  };
};
