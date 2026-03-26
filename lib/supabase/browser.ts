import { createBrowserClient } from "@supabase/ssr";

import { APP_CONFIG } from "@/lib/config";
import { Database } from "@/lib/supabase/database.types";

export const createSupabaseBrowserClient = () => {
  if (!APP_CONFIG.supabaseUrl || !APP_CONFIG.supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createBrowserClient<Database>(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseAnonKey);
};
