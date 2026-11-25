import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "ADMIN" | "CASHIER" | "OPERATOR";
}

// In-memory rate limiter for login attempts: max 5 failed attempts per 15 minutes
interface RateLimitRecord {
  attempts: number;
  lastAttempt: number;
  blockedUntil: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

const AUTH_SECRET = process.env.AUTH_SECRET || "jaimatadi_secure_session_secret_2026_welding";
const DEFAULT_USERNAME = process.env.SHOP_OWNER_USERNAME || "admin";
const DEFAULT_PASSWORD = process.env.SHOP_OWNER_PASSWORD || "JaiMataDi@2026";

/**
 * Checks and records rate limiting for an IP address
 */
export function checkLoginRateLimit(ip: string): { allowed: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (record && record.blockedUntil > now) {
    const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip: string) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { attempts: 0, lastAttempt: now, blockedUntil: 0 };
  record.attempts += 1;
  record.lastAttempt = now;

  // Block for 15 minutes after 5 failed attempts
  if (record.attempts >= 5) {
    record.blockedUntil = now + 15 * 60 * 1000;
  }

  rateLimitMap.set(ip, record);
}

export function recordSuccessfulLogin(ip: string) {
  rateLimitMap.delete(ip);
}

/**
 * Creates a cryptographically signed HMAC token for the user session
 */
export function createSessionToken(user: SessionUser): string {
  const payload = {
    user,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

/**
 * Verifies the signed session token
 */
export function verifySessionToken(token: string): { valid: boolean; user?: SessionUser } {
  try {
    if (!token || typeof token !== "string" || !token.includes(".")) return { valid: false };
    const parts = token.split(".");
    if (parts.length !== 2) return { valid: false };
    const [payloadB64, signature] = parts;
    if (!payloadB64 || !signature) return { valid: false };

    const expectedSig = crypto.createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url");
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
    if (!payload || !payload.expiresAt || typeof payload.expiresAt !== "number" || Date.now() > payload.expiresAt) {
      return { valid: false };
    }

    return { valid: true, user: payload.user };
  } catch {
    return { valid: false };
  }
}

/**
 * Validates shop owner login credentials
 */
export function validateShopOwnerCredentials(
  identifier: string,
  pass: string
): { success: boolean; user?: SessionUser } {
  const cleanId = (identifier || "").trim().toLowerCase();
  const expectedUser = DEFAULT_USERNAME.toLowerCase();
  const expectedEmail = "owner@jaimatadi.com";

  const matchesUser = cleanId === expectedUser || cleanId === expectedEmail;
  const matchesPass = pass === DEFAULT_PASSWORD;

  if (matchesUser && matchesPass) {
    return {
      success: true,
      user: {
        id: "owner-vaibhav-1",
        name: "Vaibhav Wagh (Shop Owner)",
        username: DEFAULT_USERNAME,
        email: "owner@jaimatadi.com",
        role: "ADMIN",
      },
    };
  }

  return { success: false };
}

/**
 * Server-side authorization check for API routes
 */
export function verifyApiAuth(request: NextRequest): { authorized: boolean; user?: SessionUser; error?: string } {
  // 1. Check HttpOnly cookie
  const sessionCookie = request.cookies.get("shop_session")?.value;
  if (sessionCookie) {
    const verified = verifySessionToken(sessionCookie);
    if (verified.valid && verified.user) {
      return { authorized: true, user: verified.user };
    }
  }

  // 2. Check Bearer Authorization header
  const authHeader = request.headers.get("authorization");
  const apiSecret = process.env.API_AUTH_SECRET || process.env.AUTH_SECRET;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    // Check if token is the API secret or a signed user session token
    if (apiSecret && token === apiSecret) {
      return {
        authorized: true,
        user: {
          id: "api-service",
          name: "API Secret Key",
          username: "api",
          email: "api@jaimatadi.com",
          role: "ADMIN",
        },
      };
    }

    const verified = verifySessionToken(token);
    if (verified.valid && verified.user) {
      return { authorized: true, user: verified.user };
    }
  }

  return { authorized: false, error: "Authentication required. Please log in." };
}
