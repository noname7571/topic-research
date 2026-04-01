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
  "about",
  "people",
  "their",
  "there",
  "because",
  "across",
  "between",
  "using",
  "users",
  "tools",
  "tool",
]);

const THEME_BUCKETS: Array<{
  name: string;
  patterns: RegExp[];
  summaryLead: string;
}> = [
  {
    name: "Trust and credibility concerns",
    patterns: [/trust|credib|scam|fake|proof|risk|unsafe|legit/i],
    summaryLead: "Communities are debating trust signals and proof requirements.",
  },
  {
    name: "Onboarding and usability friction",
    patterns: [/onboard|setup|ux|usability|confus|complex|learning curve|friction/i],
    summaryLead: "Users repeatedly flag onboarding complexity and workflow friction.",
  },
  {
    name: "Pricing and value pressure",
    patterns: [/pricing|price|cost|expensive|subscription|roi|value for money/i],
    summaryLead: "Discussion emphasizes value justification relative to cost.",
  },
  {
    name: "Workflow integration needs",
    patterns: [/workflow|integrat|stack|api|automation|pipeline|compatib/i],
    summaryLead: "Demand concentrates around fit with existing workflows.",
  },
  {
    name: "Execution playbooks and tactics",
    patterns: [/strategy|playbook|how to|framework|step|tactic|implementation/i],
    summaryLead: "The strongest threads focus on practical execution details.",
  },
  {
    name: "Hype versus reality tension",
    patterns: [/hype|overhyped|viral|buzz|fomo|trend fatigue|reality/i],
    summaryLead: "Sentiment is split between excitement and skepticism.",
  },
  {
    name: "Emerging demand and opportunity",
    patterns: [/opportun|demand|market gap|growth|segment|adoption|traction/i],
    summaryLead: "Signals indicate emerging demand and underserved segments.",
  },
];

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

const inferFallbackThemeName = (
  groupedItems: DiscussionItem[],
  topic: string,
): string => {
  const tokenCounts = new Map<string, number>();

  for (const item of groupedItems) {
    const tokens = extractKeywords(`${item.title} ${item.snippet}`);
    for (const token of tokens) {
      tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
    }
  }

  const topTokens = Array.from(tokenCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([token]) => token)
    .slice(0, 2);

  if (topTokens.length === 0) {
    return `Execution themes in ${titleCase(topic)}`;
  }

  if (topTokens.length === 1) {
    return `${titleCase(topTokens[0])} as a strategic theme`;
  }

  return `${titleCase(topTokens[0])} and ${titleCase(topTokens[1])} dynamics`;
};

const buildThemeSummary = (
  groupedItems: DiscussionItem[],
  fallbackLead: string,
): string => {
  const topTitles = groupedItems
    .slice(0, 2)
    .map((item) => item.title)
    .join(" | ");

  if (!topTitles) {
    return fallbackLead;
  }

  return `${fallbackLead} Evidence: ${topTitles}`;
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

  const grouped = new Map<string, { items: DiscussionItem[]; summaryLead: string }>();

  for (const item of items) {
    const searchable = `${item.title} ${item.snippet}`.toLowerCase();
    const bucket =
      THEME_BUCKETS.find((candidate) =>
        candidate.patterns.some((pattern) => pattern.test(searchable)),
      ) ?? null;

    const themeKey = bucket?.name ?? "__dynamic__";
    if (!grouped.has(themeKey)) {
      grouped.set(themeKey, {
        items: [],
        summaryLead: bucket?.summaryLead ?? "Conversation clusters around recurring practical concerns.",
      });
    }

    grouped.get(themeKey)?.items.push(item);
  }

  return Array.from(grouped.entries())
    .map(([themeKey, group]) => {
      const groupedItems = group.items;
      const themeName =
        themeKey === "__dynamic__"
          ? inferFallbackThemeName(groupedItems, topic)
          : themeKey;
      const summary = buildThemeSummary(groupedItems, group.summaryLead);
      const sentimentScore = groupedItems.reduce((acc, item) => {
        return acc + scoreSentiment(`${item.title} ${item.snippet}`);
      }, 0);

      return {
        name: themeName,
        summary,
        sentiment: sentimentFromScore(sentimentScore),
        volume: groupedItems.length,
        signalExamples: groupedItems.slice(0, 3).map((item) => item.title),
      } satisfies ThemeInsight;
    })
    .sort((left, right) => {
      if (right.volume !== left.volume) {
        return right.volume - left.volume;
      }

      const leftSignal = left.signalExamples[0]?.length ?? 0;
      const rightSignal = right.signalExamples[0]?.length ?? 0;
      return rightSignal - leftSignal;
    })
    .slice(0, 7);
};
