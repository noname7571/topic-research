import { SupabaseClient } from "@supabase/supabase-js";

import {
  canRunAnalysis,
  getPlanDailyLimit,
  getRemainingSearches,
  normalizePlan,
  PLAN_LOCKED_SECTIONS,
} from "@/lib/billing/plans";
import { APP_CONFIG } from "@/lib/config";
import type { Database } from "./supabase/database.types";
import { AccessContext, AnalysisResult, PlanTier } from "@/lib/types";

type UserProfileRow = Database["public"]["Tables"]["users"]["Row"];
type UsageLogRow = Database["public"]["Tables"]["usage_logs"]["Row"];
export type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];

export interface AccountSnapshot {
  userId: string;
  email: string;
  plan: PlanTier;
  usedToday: number;
  dailyLimit: number | null;
  remainingToday: number | null;
  canRun: boolean;
  recentSearches: Pick<UsageLogRow, "id" | "query" | "created_at">[];
  subscription: Pick<
    SubscriptionRow,
    "status" | "cancel_at_period_end" | "current_period_end"
  > | null;
}

const startOfDayIso = (): string => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
};

const ensureUserProfile = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string,
): Promise<UserProfileRow | null> => {
  const { data: existing } = await supabase
    .from("users")
    .select("id, email, plan, credits_remaining, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: inserted } = await supabase
    .from("users")
    .upsert({
      id: userId,
      email,
      plan: "free",
    })
    .select("id, email, plan, credits_remaining, created_at")
    .maybeSingle();

  return inserted ?? null;
};

export const getAccountSnapshot = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  email: string,
): Promise<AccountSnapshot> => {
  const profile = await ensureUserProfile(supabase, userId, email);
  const plan = normalizePlan(profile?.plan);
  const dailyLimit = getPlanDailyLimit(plan);

  const dayStart = startOfDayIso();

  const { count } = await supabase
    .from("usage_logs")
    .select("id", { head: true, count: "exact" })
    .eq("user_id", userId)
    .gte("created_at", dayStart);

  const usedToday = count ?? 0;
  const remainingToday = getRemainingSearches(plan, usedToday);

  const { data: recentSearches } = await supabase
    .from("usage_logs")
    .select("id, query, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(12);

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, cancel_at_period_end, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    userId,
    email,
    plan,
    usedToday,
    dailyLimit,
    remainingToday,
    canRun: canRunAnalysis(plan, usedToday),
    recentSearches: recentSearches ?? [],
    subscription: subscription ?? null,
  };
};

export const logUsageEvent = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  query: string,
): Promise<void> => {
  await supabase.from("usage_logs").insert({
    user_id: userId,
    query,
  });
};

export const attachAccessContext = (
  analysis: AnalysisResult,
  account: AccountSnapshot,
): AnalysisResult => {
  const accessContext: AccessContext = {
    plan: account.plan,
    usedToday: account.usedToday,
    dailyLimit: account.dailyLimit,
    remainingToday: account.remainingToday,
    lockedSections: PLAN_LOCKED_SECTIONS[account.plan],
    upgradeMessage:
      account.plan === "free"
        ? "Unlock full analysis with Pro to access opportunities, contrarian insights, action simulator, trends, and content ideas."
        : undefined,
  };

  return {
    ...analysis,
    accessContext,
  };
};

export const applyPlanGating = (
  analysis: AnalysisResult,
  account: AccountSnapshot,
): AnalysisResult => {
  if (account.plan !== "free") {
    const totalSources = analysis.sampleSources.length;
    const planSourceLimit =
      account.plan === "premium"
        ? APP_CONFIG.premiumSourcesVisibleLimit
        : APP_CONFIG.proSourcesVisibleLimit;
    const visibleCap = Math.max(APP_CONFIG.freeSourcesVisibleLimit, planSourceLimit);
    const visibleSources = analysis.sampleSources.slice(0, visibleCap);

    return attachAccessContext(
      {
        ...analysis,
        sampleSources: visibleSources,
        sourceAccess: {
          tier: account.plan,
          defaultVisibleCount: Math.min(APP_CONFIG.freeSourcesVisibleLimit, visibleSources.length),
          totalCount: totalSources,
          hiddenCount: Math.max(0, totalSources - visibleSources.length),
          canViewAll: account.plan === "premium",
        },
      },
      account,
    );
  }

  return attachAccessContext(
    {
      ...analysis,
      executiveSummary: {
        ...analysis.executiveSummary,
        bullets: analysis.executiveSummary.bullets.slice(0, 4),
      },
      keyThemes: analysis.keyThemes.slice(0, 3).map((theme) => ({
        ...theme,
        whatPeopleAreSaying: undefined,
        whyItMatters: undefined,
        implication: undefined,
        actionLayer: undefined,
      })),
      trends: [],
      opportunities: [],
      contrarianInsights: [],
      actionSimulator: [],
      contentIdeas: [],
      sampleSources: analysis.sampleSources.slice(0, 5),
      sourceAccess: {
        tier: "free",
        defaultVisibleCount: Math.min(5, analysis.sampleSources.length),
        totalCount: analysis.sampleSources.length,
        hiddenCount: Math.max(0, analysis.sampleSources.length - 5),
        canViewAll: false,
      },
    },
    account,
  );
};
