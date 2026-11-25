import { NextResponse, NextRequest } from "next/server";

// Public path prefixes that do not require login
const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/api/whatsapp",
  "/_next",
  "/branding",
  "/favicon.ico",
  "/manifest.json",
  "/icons",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow public routes and static assets
  for (const publicPath of PUBLIC_PATHS) {
    if (pathname === publicPath || pathname.startsWith(`${publicPath}/`)) {
      return NextResponse.next();
    }
  }

  // Allow static files (images, css, etc.)
  if (
    pathname.includes(".") &&
    !pathname.endsWith(".html") &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.next();
  }

  // 2. Check session cookie
  const sessionCookie = request.cookies.get("shop_session")?.value;

  // Basic check of session token format
  let isAuthenticated = false;
  if (sessionCookie && sessionCookie.includes(".")) {
    try {
      const [payloadB64] = sessionCookie.split(".");
      const payload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf8")
      );
      if (payload && payload.expiresAt && Date.now() < payload.expiresAt) {
        isAuthenticated = true;
      }
    } catch {
      isAuthenticated = false;
    }
  }

  if (isAuthenticated) {
    // If user is logged in and visits /login, redirect to dashboard
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 3. Not authenticated
  // If it's an API route, return 401 Unauthorized
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
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
