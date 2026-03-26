import { NextResponse } from "next/server";

import { getAccountSnapshot } from "@/lib/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await getAccountSnapshot(supabase, user.id, user.email ?? "");

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      account,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to load account data." },
      { status: 500 },
    );
  }
}
