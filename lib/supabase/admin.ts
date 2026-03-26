import { createClient } from "@supabase/supabase-js";

import { APP_CONFIG } from "@/lib/config";
import type { Database } from "./database.types";

export const createSupabaseAdminClient = () => {
  if (!APP_CONFIG.supabaseUrl || !APP_CONFIG.supabaseServiceRoleKey) {
    throw new Error("Supabase admin environment variables are not configured.");
  }

  return createClient<Database>(APP_CONFIG.supabaseUrl, APP_CONFIG.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
