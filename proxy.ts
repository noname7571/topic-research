import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { APP_CONFIG } from "@/lib/config";

const protectedPrefixes = ["/dashboard"];
const authPrefixes = ["/login", "/signup"];

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  if (!APP_CONFIG.supabaseUrl || !APP_CONFIG.supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const needsAuth = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (needsAuth && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && authPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
