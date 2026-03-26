import { DiscussionItem } from "@/lib/types";

interface RedditListing {
  data?: {
    children?: Array<{
      data?: {
        id?: string;
        title?: string;
        selftext?: string;
        author?: string;
        permalink?: string;
        created_utc?: number;
        score?: number;
        num_comments?: number;
        subreddit_name_prefixed?: string;
      };
    }>;
  };
}

const REDDIT_USER_AGENT = "social-intelligence-platform/0.1";

export const fetchRedditDiscussions = async (
  topic: string,
  queries: string[],
): Promise<DiscussionItem[]> => {
  const selectedQueries = queries.slice(0, 3);
  const allItems: DiscussionItem[] = [];

  await Promise.all(
    selectedQueries.map(async (query) => {
      const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=top&t=month&limit=18`;

      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": REDDIT_USER_AGENT,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as RedditListing;
        const children = payload.data?.children ?? [];

        for (const child of children) {
          const post = child.data;
          if (!post?.id || !post.title || !post.permalink || !post.created_utc) {
            continue;
          }

          const body = (post.selftext ?? "").trim();
          const snippet = body.length > 0 ? body : post.title;

          allItems.push({
            id: `reddit-${post.id}`,
            platform: "reddit",
            title: post.title,
            snippet: snippet.slice(0, 420),
            author: post.author,
            url: `https://www.reddit.com${post.permalink}`,
            publishedAt: new Date(post.created_utc * 1000).toISOString(),
            engagement: (post.score ?? 0) + (post.num_comments ?? 0) * 2,
            commentCount: post.num_comments ?? 0,
            source: post.subreddit_name_prefixed ?? "Reddit",
            queryUsed: query,
          });
        }
      } catch {
        return;
      }
    }),
  );

  const deduped = new Map<string, DiscussionItem>();
  for (const item of allItems) {
    const key = item.id;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  return Array.from(deduped.values());
};
