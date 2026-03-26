import { DiscussionItem, SentimentLabel, SentimentOverview } from "@/lib/types";

const POSITIVE_WORDS = new Set([
  "love",
  "useful",
  "great",
  "improving",
  "opportunity",
  "promising",
  "excited",
  "strong",
  "growth",
  "valuable",
  "win",
]);

const NEGATIVE_WORDS = new Set([
  "hate",
  "scam",
  "overhyped",
  "risk",
  "concern",
  "bad",
  "decline",
  "problem",
  "burnout",
  "expensive",
  "failure",
]);

const tokenize = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
};

export const scoreSentiment = (text: string): number => {
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return 0;
  }

  let score = 0;
  for (const token of tokens) {
    if (POSITIVE_WORDS.has(token)) {
      score += 1;
    }

    if (NEGATIVE_WORDS.has(token)) {
      score -= 1;
    }
  }

  return score;
};

export const sentimentFromScore = (score: number): SentimentLabel => {
  if (score >= 2) {
    return "positive";
  }

  if (score <= -2) {
    return "negative";
  }

  return "neutral";
};

export const annotateSentiment = (items: DiscussionItem[]): DiscussionItem[] => {
  return items.map((item) => {
    const text = `${item.title} ${item.snippet}`;
    const score = scoreSentiment(text);
    return {
      ...item,
      sentiment: sentimentFromScore(score),
    };
  });
};

export const summarizeSentiment = (items: DiscussionItem[]): SentimentOverview => {
  const counts = {
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  for (const item of items) {
    const label = item.sentiment ?? "neutral";
    counts[label] += 1;
  }

  const dominant: SentimentLabel =
    counts.positive >= counts.neutral && counts.positive >= counts.negative
      ? "positive"
      : counts.negative >= counts.neutral
        ? "negative"
        : "neutral";

  return {
    ...counts,
    dominant,
  };
};
