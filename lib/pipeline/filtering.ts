import { DiscussionItem } from "@/lib/types";

const NOISE_PATTERNS = [
  /subscribe/i,
  /giveaway/i,
  /follow for more/i,
  /promo code/i,
  /sponsored/i,
];

const normalizeKey = (item: DiscussionItem): string => {
  return `${item.platform}:${item.title}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
};

const hoursSince = (isoDate: string): number => {
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) {
    return 9999;
  }

  return (Date.now() - timestamp) / (1000 * 60 * 60);
};

export const filterNoise = (items: DiscussionItem[]): DiscussionItem[] => {
  const seen = new Set<string>();

  const filtered = items.filter((item) => {
    const key = normalizeKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);

    const content = `${item.title} ${item.snippet}`.trim();
    if (content.length < 40) {
      return false;
    }

    if (NOISE_PATTERNS.some((pattern) => pattern.test(content))) {
      return false;
    }

    if (hoursSince(item.publishedAt) > 24 * 180) {
      return false;
    }

    return true;
  });

  return filtered.sort((left, right) => {
    const leftScore = left.engagement - hoursSince(left.publishedAt) * 0.3;
    const rightScore = right.engagement - hoursSince(right.publishedAt) * 0.3;
    return rightScore - leftScore;
  });
};
