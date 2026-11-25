import { NextResponse, NextRequest } from "next/server";

const AUTH_SECRET = process.env.AUTH_SECRET || "jaimatadi_secure_session_secret_2026_welding";

// Public paths that do not require login
// Note: Only /api/whatsapp/webhook is public for receiving Meta notifications.
// /api/whatsapp/send-invoice requires shop authentication.
const EXACT_PUBLIC_PATHS = [
  "/login",
  "/favicon.ico",
  "/manifest.json",
  "/sw.js",
  "/api/whatsapp/webhook",
];

const PREFIX_PUBLIC_PATHS = [
  "/api/auth",
  "/_next",
  "/branding",
  "/icons",
];

/**
 * Verifies the cryptographic HMAC SHA-256 signature and expiration of the shop_session cookie
 * using Web Crypto API (fully compatible with Edge and Node.js runtimes).
 */
async function verifySessionCookie(sessionCookie: string | undefined): Promise<boolean> {
  if (!sessionCookie || typeof sessionCookie !== "string" || !sessionCookie.includes(".")) {
    return false;
  }

  const parts = sessionCookie.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, signatureB64Url] = parts;
  if (!payloadB64 || !signatureB64Url) return false;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(AUTH_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Convert base64url signature to Uint8Array
    const base64 = signatureB64Url.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const binaryStr = atob(pad);
    const sigBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      sigBytes[i] = binaryStr.charCodeAt(i);
    }

    const dataBytes = enc.encode(payloadB64);
    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, dataBytes);
    if (!isValid) return false;

    // Check expiration timestamp
    const payloadBase64 = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    const payloadPad = payloadBase64.padEnd(payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4), "=");
    const payloadJson = atob(payloadPad);
    const payload = JSON.parse(payloadJson);

    if (!payload || !payload.expiresAt || typeof payload.expiresAt !== "number" || Date.now() > payload.expiresAt) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow exact public routes
  if (EXACT_PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // 2. Allow prefixed public paths
  for (const prefix of PREFIX_PUBLIC_PATHS) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return NextResponse.next();
    }
  }

  // 3. Allow static asset files (images, css, etc.)
  if (
    pathname.includes(".") &&
    !pathname.endsWith(".html") &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // 4. Verify cryptographic session cookie
  const sessionCookie = request.cookies.get("shop_session")?.value;
  const isAuthenticated = await verifySessionCookie(sessionCookie);

  if (isAuthenticated) {
    // If authenticated user visits /login, redirect to dashboard
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 5. Unauthenticated request handling
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { success: false, error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  // Redirect page requests to /login
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
