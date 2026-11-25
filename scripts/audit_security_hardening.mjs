import http from "http";
import fs from "fs";
import crypto from "crypto";

// Load .env.local if present so test client signs with the exact active server secret
if (fs.existsSync(".env.local")) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const AUTH_SECRET = process.env.AUTH_SECRET || "jaimatadi_secure_session_secret_2026_welding";
const PORT = 3000;

function httpRequest({ path, method = "GET", headers = {}, data = null }) {
  return new Promise((resolve, reject) => {
    const postData = data ? (typeof data === "string" ? data : JSON.stringify(data)) : null;
    const reqHeaders = { ...headers };
    if (postData && !reqHeaders["Content-Type"]) {
      reqHeaders["Content-Type"] = "application/json";
    }
    if (postData && !reqHeaders["Content-Length"]) {
      reqHeaders["Content-Length"] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: "localhost",
        port: PORT,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on("error", reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error(`Request timeout for ${method} ${path}`));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function makeValidSessionToken(role = "ADMIN") {
  const payload = {
    user: {
      id: "owner-vaibhav-1",
      name: "Vaibhav Wagh (Shop Owner)",
      username: "admin",
      email: "owner@jaimatadi.com",
      role,
    },
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

async function runHardenedSecurityTests() {
  console.log("================================================================================");
  console.log("🔒 ADVANCED SECURITY HARDENING TEST SUITE");
  console.log("   Welding Shop Billing Application - Production Handover");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = "") {
    if (condition) {
      console.log(`  ✅ PASS: ${testName} ${detail}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail}`);
      failed++;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: SQL Migration Files Static Security Analysis
  // -------------------------------------------------------------------------
  console.log("1. STATIC SECURITY AUDIT ON SQL MIGRATION FILES");
  const rlsSql = fs.readFileSync("supabase/migrations/20261124_02_row_level_security.sql", "utf8");
  const storageSql = fs.readFileSync("supabase/migrations/20261124_03_storage_bucket.sql", "utf8");

  // Parse each CREATE POLICY statement individually
  const createPolicies = rlsSql.split("CREATE POLICY").slice(1).map(p => p.split(";")[0]);
  const anonPolicies = createPolicies.filter(p => p.includes("TO anon"));

  const anonOnCustomers = anonPolicies.some(p => p.includes("ON customers"));
  const anonOnInvoices = anonPolicies.some(p => p.includes("ON invoices"));
  const anonOnPayments = anonPolicies.some(p => p.includes("ON payments"));
  const anonOnBackup = anonPolicies.some(p => p.includes("ON backup_logs"));

  assert(!anonOnCustomers, "RLS: No anonymous policies on customers table");
  assert(!anonOnInvoices, "RLS: No anonymous policies on invoices table");
  assert(!anonOnPayments, "RLS: No anonymous policies on payments table");
  assert(!anonOnBackup, "RLS: No anonymous policies on backup_logs table");

  // Check that anon is restricted to shop_settings and active products only
  const anonActiveProducts = rlsSql.includes("is_active = true") && rlsSql.includes("Anon read active products");
  assert(anonActiveProducts, "RLS: Anonymous catalog access restricted to is_active = true");

  // Storage bucket audit: must be private, no public upload
  const isBucketPrivate = storageSql.includes("public,") && storageSql.includes("false, -- STRICTLY PRIVATE");
  const noPublicUpload = !storageSql.includes("INSERT\n        TO public") && !storageSql.includes("INSERT\r\n        TO public");

  assert(isBucketPrivate, "Storage: Bucket is strictly set to private (public = false)");
  assert(noPublicUpload, "Storage: Public upload policy removed (restricted to service_role/authenticated)");

  // -------------------------------------------------------------------------
  // TEST 2: Environment Secret Leak Audit
  // -------------------------------------------------------------------------
  console.log("\n2. SERVICE-ROLE & SECRETS ISOLATION AUDIT");
  const clientTs = fs.readFileSync("src/lib/supabase/client.ts", "utf8");
  assert(
    !clientTs.includes("SUPABASE_SERVICE_ROLE_KEY"),
    "Client Supabase module does NOT reference SUPABASE_SERVICE_ROLE_KEY"
  );
  assert(
    !clientTs.includes("serviceRoleKey"),
    "Client Supabase module does NOT contain service-role variables"
  );

  // -------------------------------------------------------------------------
  // TEST 3: Unauthenticated API Route Protection
  // -------------------------------------------------------------------------
  console.log("\n3. UNAUTHENTICATED API ROUTE ACCESS AUDIT (Must return HTTP 401)");

  const sensitiveEndpoints = [
    { path: "/api/customers", method: "GET" },
    { path: "/api/invoices", method: "GET" },
    { path: "/api/payments", method: "GET" },
    { path: "/api/database/status", method: "GET" },
    { path: "/api/database/migrate", method: "POST", data: {} },
    { path: "/api/whatsapp/send-invoice", method: "POST", data: { customerPhone: "9561482326" } },
  ];

  for (const ep of sensitiveEndpoints) {
    const res = await httpRequest({ path: ep.path, method: ep.method, data: ep.data });
    assert(
      res.statusCode === 401,
      `Unauthenticated ${ep.method} ${ep.path}`,
      `got HTTP ${res.statusCode}`
    );
  }

  // -------------------------------------------------------------------------
  // TEST 4: Public WhatsApp Webhook Endpoint Access
  // -------------------------------------------------------------------------
  console.log("\n4. PUBLIC WEBHOOK ACCESS AUDIT");
  const webhookRes = await httpRequest({
    path: "/api/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test_challenge&hub.verify_token=invalid",
    method: "GET",
  });
  // Should NOT be blocked with 401 by middleware (will return 403 or challenge response)
  assert(
    webhookRes.statusCode !== 401,
    "WhatsApp Webhook endpoint is publicly reachable for Meta servers (not blocked with 401)",
    `got HTTP ${webhookRes.statusCode}`
  );

  // -------------------------------------------------------------------------
  // TEST 5: Forged / Tampered Session Cookie Defense (HMAC SHA-256)
  // -------------------------------------------------------------------------
  console.log("\n5. FORGED COOKIE ATTACK DEFENSE (HMAC Signature Verification)");

  // Attack 1: Forged payload with fabricated future expiresAt and fake signature
  const fakePayloadB64 = Buffer.from(
    JSON.stringify({
      user: { id: "hacker", role: "ADMIN" },
      expiresAt: Date.now() + 100000000,
    })
  ).toString("base64url");
  const forgedCookie = `${fakePayloadB64}.forged_fake_hmac_signature_xyz123`;

  const forgedRes = await httpRequest({
    path: "/api/customers",
    method: "GET",
    headers: { Cookie: `shop_session=${forgedCookie}` },
  });
  assert(
    forgedRes.statusCode === 401,
    "Forged HMAC cookie is strictly rejected with HTTP 401",
    `got HTTP ${forgedRes.statusCode}`
  );

  // Attack 2: Tampered payload with original signature
  const validToken = makeValidSessionToken();
  const [valPayload, valSig] = validToken.split(".");
  const tamperedPayloadB64 = Buffer.from(
    JSON.stringify({
      user: { id: "tampered_attacker", role: "ADMIN" },
      expiresAt: Date.now() + 100000000,
    })
  ).toString("base64url");
  const tamperedCookie = `${tamperedPayloadB64}.${valSig}`;

  const tamperedRes = await httpRequest({
    path: "/api/customers",
    method: "GET",
    headers: { Cookie: `shop_session=${tamperedCookie}` },
  });
  assert(
    tamperedRes.statusCode === 401,
    "Tampered payload with valid signature is rejected with HTTP 401",
    `got HTTP ${tamperedRes.statusCode}`
  );

  // Attack 3: Expired validly signed session token
  const expiredPayload = {
    user: { id: "owner-1", role: "ADMIN" },
    expiresAt: Date.now() - 5000, // 5 seconds ago
  };
  const expB64 = Buffer.from(JSON.stringify(expiredPayload)).toString("base64url");
  const expSig = crypto.createHmac("sha256", AUTH_SECRET).update(expB64).digest("base64url");
  const expiredCookie = `${expB64}.${expSig}`;

  const expiredRes = await httpRequest({
    path: "/api/customers",
    method: "GET",
    headers: { Cookie: `shop_session=${expiredCookie}` },
  });
  assert(
    expiredRes.statusCode === 401,
    "Expired session cookie is rejected with HTTP 401",
    `got HTTP ${expiredRes.statusCode}`
  );

  // -------------------------------------------------------------------------
  // TEST 6: Legitimate Signed Session Cookie Authorization
  // -------------------------------------------------------------------------
  console.log("\n6. LEGITIMATE SIGNED SESSION AUTHORIZATION");
  const legitToken = makeValidSessionToken();
  const legitRes = await httpRequest({
    path: "/api/customers",
    method: "GET",
    headers: { Cookie: `shop_session=${legitToken}` },
  });
  assert(
    legitRes.statusCode === 200,
    "Legitimate HMAC signed session cookie allows authorized access",
    `got HTTP ${legitRes.statusCode}`
  );

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runHardenedSecurityTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
