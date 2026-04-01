import { APP_CONFIG } from "@/lib/config";
import { DiscussionItem } from "@/lib/types";

import { buildMockDiscussions } from "./mock";
import { fetchNewsDiscussions } from "./news";
import { fetchRedditDiscussions } from "./reddit";
import { fetchSearchDiscussions } from "./search";
import { fetchYouTubeDiscussions } from "./youtube";

export const fetchDiscussions = async (
  topic: string,
  expandedQueries: string[],
): Promise<DiscussionItem[]> => {
  const [search, reddit, youtube, news] = await Promise.all([
    fetchSearchDiscussions(topic, expandedQueries),
    fetchRedditDiscussions(topic, expandedQueries),
    fetchYouTubeDiscussions(topic, expandedQueries),
    fetchNewsDiscussions(topic, expandedQueries),
  ]);

  let combined = [...search, ...reddit, ...youtube, ...news];

  if (combined.length === 0) {
    combined = buildMockDiscussions(topic, expandedQueries[0] ?? topic);
  } else if (combined.length < 12) {
    combined = [
      ...combined,
      ...buildMockDiscussions(topic, expandedQueries[0] ?? topic).slice(0, 4),
    ];
  }

  const deduped = new Map<string, DiscussionItem>();
  for (const item of combined) {
    const key = `${item.platform}:${item.url}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  return Array.from(deduped.values())
    .sort((left, right) => right.engagement - left.engagement)
    .slice(0, APP_CONFIG.maxSignalsPerRun);
};
