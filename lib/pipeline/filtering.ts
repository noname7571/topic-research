import { DiscussionItem } from "@/lib/types";

import { APP_CONFIG } from "@/lib/config";

const NOISE_PATTERNS = [
  /subscribe/i,
  /giveaway/i,
  /follow for more/i,
  /promo code/i,
  /sponsored/i,
  /click here/i,
  /free money/i,
  /telegram/i,
  /whatsapp/i,
  /airdrops?/i,
];

const ENGLISH_HINTS = new Set([
  "the",
  "and",
  "with",
  "for",
  "this",
  "that",
  "from",
  "what",
  "how",
  "why",
  "people",
  "users",
  "market",
]);

interface FilterContext {
  topic: string;
  expandedQueries: string[];
}

const normalizeKey = (item: DiscussionItem): string => {
  return `${item.platform}:${item.title}:${item.snippet.slice(0, 120)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
};

const hoursSince = (isoDate: string): number => {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) {
    return 9999;
  }

  return (Date.now() - timestamp) / (1000 * 60 * 60);
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
  const queryText = [topic, ...expandedQueries].join(" ");
  return new Set(
    tokenize(queryText).filter((token) => token.length > 2),
  );
};

const keywordMatchScore = (text: string, queryTokens: Set<string>): number => {
  if (queryTokens.size === 0) {
    return 0;
  }

  const tokens = toTokenSet(text);
  let matches = 0;
  for (const token of queryTokens) {
    if (tokens.has(token)) {
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

  let bestSimilarity = 0;
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
    const jaccard = union > 0 ? intersection / union : 0;
    if (jaccard > bestSimilarity) {
      bestSimilarity = jaccard;
    }
  }

  return bestSimilarity * 30;
};

const isLikelyEnglish = (text: string): boolean => {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return false;
  }

  const asciiChars = trimmed.match(/[A-Za-z\s0-9.,!?;:'"()\-]/g)?.length ?? 0;
  const asciiRatio = asciiChars / trimmed.length;
  if (asciiRatio < 0.7) {
    return false;
  }

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) {
    return false;
  }

  const englishHints = tokens.filter((token) => ENGLISH_HINTS.has(token)).length;
  return englishHints > 0 || asciiRatio > 0.92;
};

const qualityScore = (item: DiscussionItem): number => {
  const recency = Math.max(0, 1 - hoursSince(item.publishedAt) / (24 * 45));
  const engagement = Math.log10(item.engagement + 10) * 15;
  return recency * 12 + engagement;
};

export const filterNoise = (
  items: DiscussionItem[],
  context: FilterContext,
): DiscussionItem[] => {
  const seen = new Set<string>();
  const queryTokens = buildQueryTokens(context.topic, context.expandedQueries);
  const minKept = Math.max(8, APP_CONFIG.relevanceMinKept);
  const maxKept = Math.max(minKept, APP_CONFIG.relevanceMaxKept);
  const baseThreshold = APP_CONFIG.relevanceMinScore;
  const thresholdFloor = Math.max(8, baseThreshold - 10);
  const platformCap = Math.max(
    1,
    Math.ceil(maxKept * Math.max(0.35, Math.min(0.9, APP_CONFIG.relevancePlatformCapRatio))),
  );

  const ranked = items
    .filter((item) => {
        const key = normalizeKey(item);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);

        const content = `${item.title} ${item.snippet}`.trim();
        if (content.length < 50) {
          return false;
        }

        if (!isLikelyEnglish(content)) {
          return false;
        }

        if (NOISE_PATTERNS.some((pattern) => pattern.test(content))) {
          return false;
        }

        if (hoursSince(item.publishedAt) > 24 * 180) {
          return false;
        }

        return true;
    })
      .map((item) => {
        const text = `${item.title} ${item.snippet}`;
        const keywordScore = keywordMatchScore(text, queryTokens);
        const semanticScore = semanticSimilarityScore(text, context.expandedQueries);
        const relevanceScore = keywordScore + semanticScore;
        return {
          item,
          relevanceScore,
          compositeScore: relevanceScore + qualityScore(item),
        };
      })
      .sort((left, right) => right.compositeScore - left.compositeScore);

  if (ranked.length === 0) {
    return [];
  }

  let adaptiveThreshold = baseThreshold;
  if (ranked.length > maxKept) {
    adaptiveThreshold = Math.max(
      baseThreshold,
      ranked[maxKept - 1]?.relevanceScore ?? baseThreshold,
    );
  }

  let candidates = ranked.filter((row) => row.relevanceScore >= adaptiveThreshold);
  if (candidates.length < minKept) {
    const minIndex = Math.min(minKept - 1, ranked.length - 1);
    const minRowScore = ranked[minIndex]?.relevanceScore ?? thresholdFloor;
    adaptiveThreshold = Math.max(thresholdFloor, Math.min(baseThreshold, minRowScore));
    candidates = ranked.filter((row) => row.relevanceScore >= adaptiveThreshold);
  }

  const selected: typeof candidates = [];
  const platformCounts = new Map<DiscussionItem["platform"], number>();

  for (const candidate of candidates) {
    if (selected.length >= maxKept) {
      break;
    }

    const currentCount = platformCounts.get(candidate.item.platform) ?? 0;
    if (currentCount >= platformCap && selected.length >= minKept) {
      continue;
    }

    selected.push(candidate);
    platformCounts.set(candidate.item.platform, currentCount + 1);
  }

  if (selected.length < minKept) {
    for (const candidate of candidates) {
      if (selected.length >= minKept || selected.length >= maxKept) {
        break;
      }

      if (selected.some((row) => row.item.id === candidate.item.id)) {
        continue;
      }

      selected.push(candidate);
    }
  }

  return selected.map((row) => row.item);
};
