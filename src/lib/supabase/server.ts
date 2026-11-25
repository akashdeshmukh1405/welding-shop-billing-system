import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isServerSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.trim() !== "" &&
    !supabaseUrl.includes("your-project-ref") &&
    ((serviceRoleKey && serviceRoleKey.trim() !== "" && !serviceRoleKey.includes("your-service-role-key")) ||
     (anonKey && anonKey.trim() !== "" && !anonKey.includes("your-anon-key")))
  );
};

let serverClientInstance: SupabaseClient | null = null;

export const getServerSupabaseClient = (): SupabaseClient | null => {
  if (!isServerSupabaseConfigured()) {
    return null;
  }

  if (!serverClientInstance && supabaseUrl) {
    const key = serviceRoleKey || anonKey;
    if (key) {
      serverClientInstance = createClient(supabaseUrl, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
  }

  return serverClientInstance;
};

export const supabaseServer = getServerSupabaseClient();
