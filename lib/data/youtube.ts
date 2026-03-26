import { API_KEYS } from "@/lib/config";
import { DiscussionItem } from "@/lib/types";

interface SearchResponse {
  items?: Array<{
    id?: {
      videoId?: string;
    };
  }>;
}

interface VideosResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      publishedAt?: string;
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
      commentCount?: string;
    };
  }>;
}

interface CommentResponse {
  items?: Array<{
    snippet?: {
      topLevelComment?: {
        snippet?: {
          textDisplay?: string;
        };
      };
    };
  }>;
}

const toSafeNumber = (value: string | undefined): number => {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fetchTopComment = async (videoId: string, apiKey: string): Promise<string> => {
  const url =
    `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&maxResults=1&order=relevance&videoId=${videoId}&key=${apiKey}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return "";
    }

    const payload = (await response.json()) as CommentResponse;
    return (
      payload.items?.[0]?.snippet?.topLevelComment?.snippet?.textDisplay
        ?.replace(/<[^>]+>/g, "")
        .trim() ?? ""
    );
  } catch {
    return "";
  }
};

export const fetchYouTubeDiscussions = async (
  topic: string,
  queries: string[],
): Promise<DiscussionItem[]> => {
  const apiKey = API_KEYS.youtube;
  if (!apiKey) {
    return [];
  }

  const publishedAfter = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const videoIds = new Set<string>();
  const selectedQueries = queries.slice(0, 2);

  for (const query of selectedQueries) {
    const searchUrl =
      "https://www.googleapis.com/youtube/v3/search" +
      `?part=snippet&type=video&order=viewCount&maxResults=8&publishedAfter=${publishedAfter}` +
      `&q=${encodeURIComponent(query)}&key=${apiKey}`;

    try {
      const response = await fetch(searchUrl, { cache: "no-store" });
      if (!response.ok) {
        continue;
      }

      const payload = (await response.json()) as SearchResponse;
      for (const item of payload.items ?? []) {
        const id = item.id?.videoId;
        if (id) {
          videoIds.add(id);
        }
      }
    } catch {
      continue;
    }
  }

  if (videoIds.size === 0) {
    return [];
  }

  const idList = Array.from(videoIds).slice(0, 10).join(",");
  const detailsUrl =
    "https://www.googleapis.com/youtube/v3/videos" +
    `?part=snippet,statistics&id=${idList}&key=${apiKey}`;

  try {
    const response = await fetch(detailsUrl, { cache: "no-store" });
    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as VideosResponse;
    const videos = payload.items ?? [];

    const discussions: Array<DiscussionItem | null> = await Promise.all(
      videos.map(async (video) => {
        const id = video.id;
        const title = video.snippet?.title;
        const publishedAt = video.snippet?.publishedAt;

        if (!id || !title || !publishedAt) {
          return null;
        }

        const description = video.snippet?.description?.slice(0, 260) ?? "";
        const topComment = await fetchTopComment(id, apiKey);
        const commentCount = toSafeNumber(video.statistics?.commentCount);
        const viewCount = toSafeNumber(video.statistics?.viewCount);
        const likeCount = toSafeNumber(video.statistics?.likeCount);

        return {
          id: `youtube-${id}`,
          platform: "youtube",
          title,
          snippet: `${description} ${topComment}`.trim().slice(0, 420),
          author: video.snippet?.channelTitle,
          url: `https://www.youtube.com/watch?v=${id}`,
          publishedAt,
          engagement: viewCount + likeCount * 4 + commentCount * 6,
          commentCount,
          source: "YouTube",
          queryUsed: topic,
        } satisfies DiscussionItem;
      }),
    );

    return discussions.filter((item): item is DiscussionItem => item !== null);
  } catch {
    return [];
  }
};
