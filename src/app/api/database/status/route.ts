import { NextRequest, NextResponse } from "next/server";
import { checkServerDatabaseStatus } from "@/lib/supabase/status";
import { verifyApiAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const auth = verifyApiAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: false,
          message: auth.error || "Authentication required",
          data: {
            isConfigured: false,
            isConnected: false,
            tablesVerified: false,
            provider: "LOCAL_OFFLINE",
            hasServiceRoleKey: false,
            message: "Unauthorized access",
          },
        },
        { status: 401 }
      );
    }

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
