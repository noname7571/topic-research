const suffixes = [
  "trends",
  "community sentiment",
  "common complaints",
  "success stories",
  "business opportunity",
  "future outlook",
  "debate",
  "hot takes",
];

const unique = <T,>(items: T[]): T[] => {
  return Array.from(new Set(items));
};

export const expandQueries = (topic: string): string[] => {
  const normalized = topic.trim().toLowerCase();
  const tokenized = normalized
    .split(/[\s,/]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2);

  const suffixQueries = suffixes.map((suffix) => `${normalized} ${suffix}`);
  const tokenQueries = tokenized.slice(0, 3).map((token) => `${token} discussion`);

  return unique([normalized, ...suffixQueries, ...tokenQueries]).slice(0, 8);
};
