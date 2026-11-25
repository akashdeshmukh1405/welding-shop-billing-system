import { isSupabaseConfigured, getSupabaseClient } from "./client";
import { isServerSupabaseConfigured, getServerSupabaseClient } from "./server";

export interface DatabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  tablesVerified: boolean;
  provider: "SUPABASE_POSTGRES" | "LOCAL_OFFLINE";
  supabaseUrl?: string;
  hasServiceRoleKey: boolean;
  message: string;
  details?: {
    shopSettingsCount?: number;
    invoicesCount?: number;
    customersCount?: number;
  };
}

export async function checkServerDatabaseStatus(): Promise<DatabaseStatus> {
  const isConfigured = isServerSupabaseConfigured();
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY.trim() !== "");

  if (!isConfigured) {
    return {
      isConfigured: false,
      isConnected: false,
      tablesVerified: false,
      provider: "LOCAL_OFFLINE",
      hasServiceRoleKey: false,
      message: "Customer Supabase credentials not set in .env.local. Operating in high-speed local mode.",
    };
  }

  const client = getServerSupabaseClient();
  if (!client) {
    return {
      isConfigured: true,
      isConnected: false,
      tablesVerified: false,
      provider: "LOCAL_OFFLINE",
      hasServiceRoleKey,
      message: "Failed to initialize Supabase client.",
    };
  }

  try {
    const { data, error } = await client.from("shop_settings").select("id, shop_name").limit(1);

    if (error) {
      return {
        isConfigured: true,
        isConnected: false,
        tablesVerified: false,
        provider: "LOCAL_OFFLINE",
        hasServiceRoleKey,
        message: `Supabase connected but table query failed: ${error.message}. Please apply migrations.`,
      };
    }

    const { count: invoicesCount } = await client.from("invoices").select("*", { count: "exact", head: true });
    const { count: customersCount } = await client.from("customers").select("*", { count: "exact", head: true });

    return {
      isConfigured: true,
      isConnected: true,
      tablesVerified: true,
      provider: "SUPABASE_POSTGRES",
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey,
      message: "Customer Supabase database connected and operational.",
      details: {
        shopSettingsCount: data?.length || 0,
        invoicesCount: invoicesCount ?? 0,
        customersCount: customersCount ?? 0,
      },
    };
  } catch (err: any) {
    return {
      isConfigured: true,
      isConnected: false,
      tablesVerified: false,
      provider: "LOCAL_OFFLINE",
      hasServiceRoleKey,
      message: `Connection error: ${err?.message || "Unknown error"}`,
    };
  }
}
