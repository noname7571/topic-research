import { API_KEYS } from "@/lib/config";
import { DiscussionItem } from "@/lib/types";

interface TavilyResponse {
  results?: Array<{
    title?: string;
    content?: string;
    url?: string;
    score?: number;
    published_date?: string;
  }>;
}

const normalizeSnippet = (input: string): string => {
  return input
    .replace(/#[^\s]+/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420);
};

const estimateEngagement = (score: number | undefined, rank: number): number => {
  const normalizedScore = Number.isFinite(score) ? Number(score) : 0.35;
  return Math.round(normalizedScore * 1500 + Math.max(0, 220 - rank * 20));
};

export const fetchSearchDiscussions = async (
  topic: string,
  queries: string[],
): Promise<DiscussionItem[]> => {
  const apiKey = API_KEYS.tavily;
  if (!apiKey) {
    return [];
  }

  const selectedQueries = queries.slice(0, 2);
  const allResults: DiscussionItem[] = [];

  for (const query of selectedQueries) {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          topic: "general",
          search_depth: "advanced",
          max_results: 10,
          include_answer: false,
          include_raw_content: false,
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as TavilyResponse;
      const results = payload.results ?? [];

      for (const [index, result] of results.entries()) {
        if (!result.url || !result.title) {
          continue;
        }

        const snippet = normalizeSnippet(result.content ?? result.title);
        if (snippet.length < 40) {
          continue;
        }

        allResults.push({
          id: `web-${Buffer.from(result.url).toString("base64").slice(0, 16)}`,
          platform: "web",
          title: result.title,
          snippet,
          url: result.url,
          publishedAt: result.published_date
            ? new Date(result.published_date).toISOString()
            : new Date().toISOString(),
          engagement: estimateEngagement(result.score, index),
          source: "Web Search",
          queryUsed: query,
        });
      }
    } catch {
      continue;
    }
  }

  const deduped = new Map<string, DiscussionItem>();
  for (const item of allResults) {
    if (!deduped.has(item.url)) {
      deduped.set(item.url, item);
    }
  }

  return Array.from(deduped.values());
};
