import { DiscussionItem, ThemeInsight } from "@/lib/types";

import { scoreSentiment, sentimentFromScore } from "./sentiment";

const STOP_WORDS = new Set([
  "about",
  "from",
  "this",
  "that",
  "with",
  "have",
  "http",
  "https",
  "www",
  "their",
  "there",
  "which",
  "while",
  "where",
  "would",
  "could",
  "should",
  "video",
  "people",
  "after",
  "before",
  "because",
  "trend",
  "trends",
  "topic",
  "discussion",
  "market",
  "future",
  "community",
  "insight",
  "insights",
  "jobs",
  "job",
  "remote",
  "work",
]);

const extractKeywords = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token));
};

const titleCase = (value: string): string => {
  return value
    .split(" ")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
};

export const clusterThemes = (items: DiscussionItem[], topic: string): ThemeInsight[] => {
  if (items.length === 0) {
    return [
      {
        name: titleCase(topic),
        summary: "Not enough signals were collected to build distinct themes.",
        sentiment: "neutral",
        volume: 0,
        signalExamples: [],
      },
    ];
  }

  const keywordCounts = new Map<string, number>();

  for (const item of items) {
    const keywords = extractKeywords(`${item.title} ${item.snippet}`);
    for (const keyword of keywords) {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) ?? 0) + 1);
    }
  }

  const topKeywords = Array.from(keywordCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([keyword]) => keyword);

  if (topKeywords.length === 0) {
    topKeywords.push(topic.toLowerCase());
  }

  const grouped = new Map<string, DiscussionItem[]>();

  for (const item of items) {
    const searchable = `${item.title} ${item.snippet}`.toLowerCase();
    const selectedTheme =
      topKeywords.find((keyword) => searchable.includes(keyword)) ?? topKeywords[0];

    if (!grouped.has(selectedTheme)) {
      grouped.set(selectedTheme, []);
    }

    grouped.get(selectedTheme)?.push(item);
  }

  return Array.from(grouped.entries())
    .map(([theme, groupedItems]) => {
      const summary = groupedItems
        .slice(0, 2)
        .map((item) => item.title)
        .join(" | ");
      const sentimentScore = groupedItems.reduce((acc, item) => {
        return acc + scoreSentiment(`${item.title} ${item.snippet}`);
      }, 0);

      return {
        name: titleCase(theme),
        summary,
        sentiment: sentimentFromScore(sentimentScore),
        volume: groupedItems.length,
        signalExamples: groupedItems.slice(0, 3).map((item) => item.title),
      } satisfies ThemeInsight;
    })
    .sort((left, right) => right.volume - left.volume)
    .slice(0, 5);
};
