import { NextResponse } from "next/server";

import { applyPlanGating, getAccountSnapshot, logUsageEvent } from "@/lib/account";
import { getRemainingSearches } from "@/lib/billing/plans";
import { APP_CONFIG } from "@/lib/config";
import {
  completeAnalysisInteraction,
  failAnalysisInteraction,
  fetchRetrievalMemoryItems,
  startAnalysisInteraction,
} from "@/lib/learning";
import { runAnalysisPipeline } from "@/lib/pipeline";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCachedAnalysis, setCachedAnalysis } from "@/lib/storage/cache";
import { AnalysisResult } from "@/lib/types";

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
  let interactionId: string | null = null;
  let userId: string | null = null;

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
    userId = user.id;

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

    interactionId = await startAnalysisInteraction(supabase, user.id, topic, {
      topic,
      requestedAt: new Date().toISOString(),
    });

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
      const cachedAnalysis: AnalysisResult = {
        ...cached,
        fromCache: true,
      };
      const cachedResponsePayload = applyPlanGating(
        {
          ...cachedAnalysis,
        },
        accountAfterUsage,
      );

      if (interactionId) {
        await completeAnalysisInteraction(
          supabase,
          user.id,
          interactionId,
          cachedAnalysis,
          {
            fromCache: true,
            memoryItemsUsed: 0,
          },
        );
      }

      return NextResponse.json({
        ...cachedResponsePayload,
        interactionId: interactionId ?? undefined,
      });
    }

    const memoryItems = await fetchRetrievalMemoryItems(supabase, user.id, topic);
    const analysis = await runAnalysisPipeline(topic, {
      memoryItems,
    });
    setCachedAnalysis(topic, analysis);

    const tieredPayload = applyPlanGating(analysis, accountAfterUsage);

    if (interactionId) {
      await completeAnalysisInteraction(supabase, user.id, interactionId, analysis, {
        fromCache: false,
        memoryItemsUsed: memoryItems.length,
      });
    }

    return NextResponse.json({
      ...tieredPayload,
      interactionId: interactionId ?? undefined,
    });
  } catch (error) {
    if (interactionId && userId) {
      try {
        const supabase = await createSupabaseServerClient();
        await failAnalysisInteraction(
          supabase,
          userId,
          interactionId,
          error instanceof Error ? error.message : "Unknown analysis error",
        );
      } catch {
        // ignore interaction logging failures during error reporting
      }
    }

    return NextResponse.json(
      {
        error: "Unable to analyze this topic right now. Try again in a moment.",
      },
      { status: 500 },
    );
  }
}
