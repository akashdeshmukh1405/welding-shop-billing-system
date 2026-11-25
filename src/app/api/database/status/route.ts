import { NextResponse } from "next/server";
import { checkServerDatabaseStatus } from "@/lib/supabase/status";

export async function GET() {
  try {
    const status = await checkServerDatabaseStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to check database status",
        data: {
          isConfigured: false,
          isConnected: false,
          tablesVerified: false,
          provider: "LOCAL_OFFLINE",
          hasServiceRoleKey: false,
          message: error?.message,
        },
      },
      { status: 500 }
    );
  }
}
