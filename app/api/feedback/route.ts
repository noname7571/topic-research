import { NextResponse } from "next/server";

import { submitAnalysisFeedback } from "@/lib/learning";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface FeedbackRequest {
  interactionId?: string;
  approved?: boolean;
  note?: string;
  labels?: string[];
}

const isValidInteractionId = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as FeedbackRequest;
    const interactionId = payload.interactionId?.trim();

    if (!interactionId || !isValidInteractionId(interactionId)) {
      return NextResponse.json(
        {
          error: "A valid interactionId is required.",
        },
        { status: 400 },
      );
    }

    if (typeof payload.approved !== "boolean") {
      return NextResponse.json(
        {
          error: "approved must be a boolean.",
        },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Please sign in to submit feedback.",
        },
        { status: 401 },
      );
    }

    const result = await submitAnalysisFeedback(supabase, user.id, interactionId, {
      approved: payload.approved,
      note: payload.note,
      labels: payload.labels,
    });

    if (!result.updated) {
      return NextResponse.json(
        {
          error: "Interaction not found for this user.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      interactionId,
      memoryUpdated: result.memoryUpdated,
      message: payload.approved
        ? result.memoryUpdated
          ? "Feedback saved. Retrieval memory updated."
          : "Feedback saved. Retrieval memory update was skipped."
        : "Feedback saved.",
    });
  } catch {
    return NextResponse.json(
      {
        error: "Unable to submit feedback right now.",
      },
      { status: 500 },
    );
  }
}
