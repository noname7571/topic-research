import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { APP_CONFIG } from "@/lib/config";
import type { Database } from "./database.types";

export const createSupabaseServerClient = async () => {
  if (!APP_CONFIG.supabaseUrl || !APP_CONFIG.supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // Server Components can be read-only for cookies; Route Handlers handle writes.
          }
        }
      },
    },
  });
};
