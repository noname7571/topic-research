import { DiscussionItem } from "@/lib/types";

const daysAgo = (days: number): string => {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
};

export const buildMockDiscussions = (
  topic: string,
  queryUsed: string,
): DiscussionItem[] => {
  const normalizedTopic = topic.trim();

  return [
    {
      id: `mock-r-1-${normalizedTopic}`,
      platform: "reddit",
      title: `People are divided on ${normalizedTopic} becoming mainstream`,
      snippet:
        "High-engagement thread where users debate whether current products solve real pain points or just novelty.",
      author: "u/community_insights",
      url: "https://www.reddit.com/r/Entrepreneur/",
      publishedAt: daysAgo(2),
      engagement: 540,
      commentCount: 189,
      source: "r/Entrepreneur",
      queryUsed,
    },
    {
      id: `mock-r-2-${normalizedTopic}`,
      platform: "reddit",
      title: `${normalizedTopic} buyers want better onboarding and trust signals`,
      snippet:
        "Users repeatedly mention confusion about setup, pricing, and long-term value before committing.",
      author: "u/productloops",
      url: "https://www.reddit.com/r/startups/",
      publishedAt: daysAgo(4),
      engagement: 422,
      commentCount: 111,
      source: "r/startups",
      queryUsed,
    },
    {
      id: `mock-y-1-${normalizedTopic}`,
      platform: "youtube",
      title: `Is ${normalizedTopic} overhyped or early opportunity?`,
      snippet:
        "Top comments split between fast-growth optimism and concerns around quality and sustainability.",
      author: "Growth Ledger",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      publishedAt: daysAgo(3),
      engagement: 1800,
      commentCount: 760,
      source: "YouTube",
      queryUsed,
    },
    {
      id: `mock-y-2-${normalizedTopic}`,
      platform: "youtube",
      title: `3 contrarian takes about ${normalizedTopic} from operators`,
      snippet:
        "Viewers resonate with practical execution advice over trend-chasing and surface-level analysis.",
      author: "Operator Notes",
      url: "https://www.youtube.com/watch?v=oHg5SJYRHA0",
      publishedAt: daysAgo(1),
      engagement: 1430,
      commentCount: 420,
      source: "YouTube",
      queryUsed,
    },
    {
      id: `mock-n-1-${normalizedTopic}`,
      platform: "news",
      title: `${normalizedTopic} startups raise capital as demand patterns shift`,
      snippet:
        "Coverage highlights maturing customer segments and pressure to prove recurring retention metrics.",
      author: "Staff",
      url: "https://example.com/news/social-intel-1",
      publishedAt: daysAgo(5),
      engagement: 210,
      source: "TechPulse",
      queryUsed,
    },
    {
      id: `mock-n-2-${normalizedTopic}`,
      platform: "news",
      title: `Analysts warn ${normalizedTopic} market may consolidate quickly`,
      snippet:
        "The most successful players appear to be focused on differentiated workflows and niche positioning.",
      author: "Analyst Desk",
      url: "https://example.com/news/social-intel-2",
      publishedAt: daysAgo(6),
      engagement: 164,
      source: "MarketWire",
      queryUsed,
    },
  ];
};
