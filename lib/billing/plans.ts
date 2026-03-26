import { APP_CONFIG } from "@/lib/config";
import { LockedSection, PlanTier } from "@/lib/types";

export const PLAN_LABELS: Record<PlanTier, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
};

export const PLAN_DAILY_LIMITS: Record<PlanTier, number | null> = {
  free: APP_CONFIG.freeTierDailyLimit,
  pro: APP_CONFIG.proTierDailyLimit,
  premium: null,
};

export const PLAN_LOCKED_SECTIONS: Record<PlanTier, LockedSection[]> = {
  free: [
    "deepThemeAnalysis",
    "trendAnalysis",
    "opportunities",
    "contrarianInsights",
    "contentIdeas",
    "evidenceDepth",
  ],
  pro: [],
  premium: [],
};

export const normalizePlan = (value: string | null | undefined): PlanTier => {
  if (value === "pro" || value === "premium") {
    return value;
  }

  return "free";
};

export const getPlanDailyLimit = (plan: PlanTier): number | null => {
  return PLAN_DAILY_LIMITS[plan];
};

export const getRemainingSearches = (
  plan: PlanTier,
  usedToday: number,
): number | null => {
  const limit = getPlanDailyLimit(plan);
  if (limit === null) {
    return null;
  }

  return Math.max(0, limit - usedToday);
};

export const canRunAnalysis = (plan: PlanTier, usedToday: number): boolean => {
  const remaining = getRemainingSearches(plan, usedToday);
  return remaining === null || remaining > 0;
};
