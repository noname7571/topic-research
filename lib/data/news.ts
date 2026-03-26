import { API_KEYS } from "@/lib/config";
import { DiscussionItem } from "@/lib/types";

interface NewsResponse {
  articles?: Array<{
    title?: string;
    description?: string;
    author?: string;
    url?: string;
    publishedAt?: string;
    source?: {
      name?: string;
    };
  }>;
}

const estimateEngagement = (publishedAt: string, title: string): number => {
  const publishedTime = new Date(publishedAt).getTime();
  const ageHours = Math.max(1, (Date.now() - publishedTime) / (1000 * 60 * 60));
  const freshness = Math.max(1, 72 - ageHours);
  return Math.round(freshness * 2 + Math.min(title.length, 80));
};

export const fetchNewsDiscussions = async (
  topic: string,
  queries: string[],
): Promise<DiscussionItem[]> => {
  const apiKey = API_KEYS.news;
  if (!apiKey) {
    return [];
  }

  const selectedQueries = queries.slice(0, 2);
  const allItems: DiscussionItem[] = [];

  await Promise.all(
    selectedQueries.map(async (query) => {
      const url =
        "https://newsapi.org/v2/everything" +
        `?q=${encodeURIComponent(query)}&sortBy=popularity&pageSize=12&language=en&apiKey=${apiKey}`;

      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as NewsResponse;
        for (const article of payload.articles ?? []) {
          if (!article.url || !article.title || !article.publishedAt) {
            continue;
          }

          allItems.push({
            id: `news-${Buffer.from(article.url).toString("base64").slice(0, 16)}`,
            platform: "news",
            title: article.title,
            snippet: (article.description ?? article.title).slice(0, 420),
            author: article.author ?? undefined,
            url: article.url,
            publishedAt: article.publishedAt,
            engagement: estimateEngagement(article.publishedAt, article.title),
            source: article.source?.name ?? "News",
            queryUsed: topic,
          });
        }
      } catch {
        return;
      }
    }),
  );

  const deduped = new Map<string, DiscussionItem>();
  for (const item of allItems) {
    if (!deduped.has(item.url)) {
      deduped.set(item.url, item);
    }
  }

  return Array.from(deduped.values());
};
