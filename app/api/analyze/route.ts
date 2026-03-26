import { NextResponse } from "next/server";

import { applyPlanGating, getAccountSnapshot, logUsageEvent } from "@/lib/account";
import { getRemainingSearches } from "@/lib/billing/plans";
import { APP_CONFIG } from "@/lib/config";
import { runAnalysisPipeline } from "@/lib/pipeline";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCachedAnalysis, setCachedAnalysis } from "@/lib/storage/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AnalyzeRequest {
  topic?: string;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    status: "ready",
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as AnalyzeRequest;
    const topic = payload.topic?.trim();

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Please sign in to run discourse analysis.",
        },
        { status: 401 },
      );
    }

    if (!topic || topic.length < 2) {
      return NextResponse.json(
        {
          error: "Please provide a topic with at least 2 characters.",
        },
        { status: 400 },
      );
    }

    const accountBeforeUsage = await getAccountSnapshot(supabase, user.id, user.email ?? "");
    if (!accountBeforeUsage.canRun) {
      return NextResponse.json(
        {
          error: "Daily plan limit reached. Upgrade for deeper and more frequent analysis.",
          limit: accountBeforeUsage.dailyLimit,
        },
        { status: 429 },
      );
    }

    await logUsageEvent(supabase, user.id, topic);

    const accountAfterUsage = {
      ...accountBeforeUsage,
      usedToday: accountBeforeUsage.usedToday + 1,
      remainingToday: getRemainingSearches(
        accountBeforeUsage.plan,
        accountBeforeUsage.usedToday + 1,
      ),
    };

    const cached = getCachedAnalysis(topic, APP_CONFIG.cacheTtlMinutes);
    if (cached) {
      const cachedResponsePayload = applyPlanGating(
        {
          ...cached,
          fromCache: true,
        },
        accountAfterUsage,
      );
      return NextResponse.json(cachedResponsePayload);
    }

    const analysis = await runAnalysisPipeline(topic);
    setCachedAnalysis(topic, analysis);

    const tieredPayload = applyPlanGating(analysis, accountAfterUsage);
    return NextResponse.json(tieredPayload);
  } catch {
    return NextResponse.json(
      {
        error: "Unable to analyze this topic right now. Try again in a moment.",
      },
      { status: 500 },
    );
  }
}
