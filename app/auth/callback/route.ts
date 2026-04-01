import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const safeNext = next.startsWith("/") ? next : "/dashboard";
  const baseUrl = requestUrl.origin;

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      const errorUrl = new URL("/login", baseUrl);
      errorUrl.searchParams.set("error", "auth_callback_failed");
      return NextResponse.redirect(errorUrl);
    }
  }

  const redirectUrl = new URL(safeNext, baseUrl);
  return NextResponse.redirect(redirectUrl);
}
