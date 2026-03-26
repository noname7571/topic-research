import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { APP_CONFIG } from "@/lib/config";
import { runAnalysisPipeline } from "@/lib/pipeline";
import { AnalysisResult } from "@/lib/types";
import {
  getCachedAnalysis,
  getDailyUsageCount,
  pruneUsageEvents,
  setCachedAnalysis,
  trackUsage,
} from "@/lib/storage/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AnalyzeRequest {
  topic?: string;
  premiumAccessToken?: string;
}

const getDateKey = (): string => {
  return new Date().toISOString().slice(0, 10);
};

const buildClientId = async (): Promise<{ value: string; needsCookie: boolean }> => {
  const cookieStore = await cookies();
  const existing = cookieStore.get("si_client_id")?.value;

  if (existing) {
    return { value: existing, needsCookie: false };
  }

  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const base = forwardedFor ?? crypto.randomUUID();
  const generated = `client-${Buffer.from(base).toString("base64").slice(0, 18)}`;

  return {
    value: generated,
    needsCookie: true,
  };
};

const withClientCookie = (
  response: NextResponse,
  clientId: string,
  needsCookie: boolean,
): NextResponse => {
  if (!needsCookie) {
    return response;
  }

  response.cookies.set({
    name: "si_client_id",
    value: clientId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
};

const isPremiumRequest = (
  payload: AnalyzeRequest,
  headerStore: Headers,
): boolean => {
  const providedToken = payload.premiumAccessToken?.trim();
  if (
    APP_CONFIG.premiumAccessToken.length > 0 &&
    providedToken &&
    providedToken === APP_CONFIG.premiumAccessToken
  ) {
    return true;
  }

  const demoTier = headerStore.get("x-si-tier")?.trim().toLowerCase();
  return process.env.NODE_ENV !== "production" && demoTier === "premium";
};

const applySourceTier = (
  analysis: AnalysisResult,
  isPremium: boolean,
): AnalysisResult => {
  const totalSources = analysis.sampleSources.length;
  const freeVisibleLimit = Math.max(1, APP_CONFIG.freeSourcesVisibleLimit);
  const premiumVisibleLimit = Math.max(freeVisibleLimit, APP_CONFIG.premiumSourcesVisibleLimit);
  const defaultVisibleCount = Math.min(freeVisibleLimit, totalSources);

  if (isPremium) {
    const premiumSources = analysis.sampleSources.slice(0, premiumVisibleLimit);
    return {
      ...analysis,
      sampleSources: premiumSources,
      sourceAccess: {
        tier: "premium",
        defaultVisibleCount,
        totalCount: premiumSources.length,
        hiddenCount: Math.max(0, premiumSources.length - defaultVisibleCount),
        canViewAll: true,
      },
    };
  }

  const freeSources = analysis.sampleSources.slice(0, defaultVisibleCount);

  return {
    ...analysis,
    sampleSources: freeSources,
    sourceAccess: {
      tier: "free",
      defaultVisibleCount,
      totalCount: totalSources,
      hiddenCount: Math.max(0, totalSources - defaultVisibleCount),
      canViewAll: false,
    },
  };
};

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
    const headerStore = await headers();
    const isPremium = isPremiumRequest(payload, headerStore);

    if (!topic || topic.length < 2) {
      return NextResponse.json(
        {
          error: "Please provide a topic with at least 2 characters.",
        },
        { status: 400 },
      );
    }

    pruneUsageEvents();

    const clientIdentity = await buildClientId();
    const dateKey = getDateKey();

    const cached = getCachedAnalysis(topic, APP_CONFIG.cacheTtlMinutes);
    if (cached) {
      const cachedResponsePayload = applySourceTier(
        {
          ...cached,
          fromCache: true,
        },
        isPremium,
      );
      const response = NextResponse.json(cachedResponsePayload);

      return withClientCookie(response, clientIdentity.value, clientIdentity.needsCookie);
    }

    const usage = getDailyUsageCount(clientIdentity.value, dateKey);
    if (!isPremium && usage >= APP_CONFIG.freeTierDailyLimit) {
      const response = NextResponse.json(
        {
          error:
            "Daily free-tier limit reached. Add billing/auth later to unlock higher limits.",
          limit: APP_CONFIG.freeTierDailyLimit,
        },
        { status: 429 },
      );

      return withClientCookie(response, clientIdentity.value, clientIdentity.needsCookie);
    }

    const analysis = await runAnalysisPipeline(topic);
    setCachedAnalysis(topic, analysis);
    trackUsage(clientIdentity.value, dateKey, topic);

    const tieredPayload = applySourceTier(analysis, isPremium);
    const response = NextResponse.json(tieredPayload);
    return withClientCookie(response, clientIdentity.value, clientIdentity.needsCookie);
  } catch {
    return NextResponse.json(
      {
        error: "Unable to analyze this topic right now. Try again in a moment.",
      },
      { status: 500 },
    );
  }
}
