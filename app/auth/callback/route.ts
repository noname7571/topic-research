import { NextResponse } from "next/server";

import { APP_CONFIG } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      const errorUrl = new URL("/login", APP_CONFIG.appUrl);
      errorUrl.searchParams.set("error", "auth_callback_failed");
      return NextResponse.redirect(errorUrl);
    }
  }

  const redirectUrl = new URL(next, APP_CONFIG.appUrl);
  return NextResponse.redirect(redirectUrl);
}
