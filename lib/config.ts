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
  proTierDailyLimit: toNumber(process.env.PRO_TIER_DAILY_LIMIT, 60),
  premiumTierDailyLimit: toNumber(process.env.PREMIUM_TIER_DAILY_LIMIT, 500),
  maxSignalsPerRun: toNumber(process.env.MAX_SIGNALS_PER_RUN, 120),
  freeSourcesVisibleLimit: toNumber(process.env.FREE_SOURCES_VISIBLE_LIMIT, 5),
  proSourcesVisibleLimit: toNumber(process.env.PRO_SOURCES_VISIBLE_LIMIT, 40),
  premiumSourcesVisibleLimit: toNumber(process.env.PREMIUM_SOURCES_VISIBLE_LIMIT, 60),
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  openAiTemperature: toNumber(process.env.OPENAI_TEMPERATURE, 0.2),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
  stripePremiumPriceId: process.env.STRIPE_PREMIUM_PRICE_ID ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};

export const API_KEYS = {
  openAi: process.env.OPENAI_API_KEY,
  youtube: process.env.YOUTUBE_API_KEY,
  news: process.env.NEWS_API_KEY,
  tavily: process.env.TAVILY_API_KEY,
};
