const toNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const APP_CONFIG = {
  cacheTtlMinutes: toNumber(process.env.CACHE_TTL_MINUTES, 60),
  freeTierDailyLimit: toNumber(process.env.FREE_TIER_DAILY_LIMIT, 5),
  maxSignalsPerRun: toNumber(process.env.MAX_SIGNALS_PER_RUN, 120),
  freeSourcesVisibleLimit: toNumber(process.env.FREE_SOURCES_VISIBLE_LIMIT, 5),
  premiumSourcesVisibleLimit: toNumber(process.env.PREMIUM_SOURCES_VISIBLE_LIMIT, 60),
  premiumAccessToken: process.env.PREMIUM_ACCESS_TOKEN ?? "",
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  openAiTemperature: toNumber(process.env.OPENAI_TEMPERATURE, 0.2),
};

export const API_KEYS = {
  openAi: process.env.OPENAI_API_KEY,
  youtube: process.env.YOUTUBE_API_KEY,
  news: process.env.NEWS_API_KEY,
  tavily: process.env.TAVILY_API_KEY,
};
