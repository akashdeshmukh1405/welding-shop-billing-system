import { NextRequest, NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = verifyApiAuth(request);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json(
      { authenticated: false, error: auth.error || "Not authenticated" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    user: auth.user,
  });
}
