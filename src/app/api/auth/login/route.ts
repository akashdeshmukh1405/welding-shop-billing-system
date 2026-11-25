import { NextRequest, NextResponse } from "next/server";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  recordSuccessfulLogin,
  validateShopOwnerCredentials,
  createSessionToken,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    // 1. Rate limiting check
    const rateCheck = checkLoginRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed login attempts. Please wait ${rateCheck.remainingSeconds} seconds before trying again.`,
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "Username and password are required." },
        { status: 400 }
      );
    }

    // 2. Validate credentials
    const authResult = validateShopOwnerCredentials(username, password);
    if (!authResult.success || !authResult.user) {
      recordFailedLogin(ip);
      return NextResponse.json(
        { success: false, error: "Invalid username or password." },
        { status: 401 }
      );
    }

    // 3. Login success
    recordSuccessfulLogin(ip);
    const token = createSessionToken(authResult.user);

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user: authResult.user,
    });

    // 4. Set HttpOnly session cookie
    // Enable secure cookie on HTTPS or production deployments; avoid blocking localhost HTTP in Safari/WebKit
    const isHttps = request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
    const isProductionHttps = process.env.NODE_ENV === "production" && isHttps;

    response.cookies.set({
      name: "shop_session",
      value: token,
      httpOnly: true,
      secure: isProductionHttps,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error: any) {
    console.error("Login route error:", error);
    return NextResponse.json(
      { success: false, error: "Authentication service error. Please try again." },
      { status: 500 }
    );
  }
}
