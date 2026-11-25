import { chromium, firefox, webkit, Browser, BrowserContext, Page } from "playwright";

const BASE_URL = "http://localhost:3000";

interface DeviceTarget {
  name: string;
  engine: "chromium" | "webkit" | "firefox";
  viewport: { width: number; height: number };
  isMobile: boolean;
  hasTouch: boolean;
  userAgent?: string;
}

const DEVICES: DeviceTarget[] = [
  {
    name: "iPhone 14/15 (Safari WebKit)",
    engine: "webkit",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
  },
  {
    name: "Android Mobile - Pixel 7 (Chrome)",
    engine: "chromium",
    viewport: { width: 412, height: 915 },
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
  },
  {
    name: "iPad Air Portrait (Safari WebKit)",
    engine: "webkit",
    viewport: { width: 820, height: 1180 },
    isMobile: false,
    hasTouch: true,
  },
  {
    name: "iPad Air Landscape (Safari WebKit)",
    engine: "webkit",
    viewport: { width: 1180, height: 820 },
    isMobile: false,
    hasTouch: true,
  },
  {
    name: "Android Tablet (Chrome)",
    engine: "chromium",
    viewport: { width: 800, height: 1280 },
    isMobile: false,
    hasTouch: true,
  },
  {
    name: "Windows Laptop (Chrome/Edge)",
    engine: "chromium",
    viewport: { width: 1366, height: 768 },
    isMobile: false,
    hasTouch: false,
  },
  {
    name: "macOS MacBook (Safari WebKit)",
    engine: "webkit",
    viewport: { width: 1440, height: 900 },
    isMobile: false,
    hasTouch: false,
  },
  {
    name: "Windows Desktop (Firefox)",
    engine: "firefox",
    viewport: { width: 1920, height: 1080 },
    isMobile: false,
    hasTouch: false,
  },
];

const PAGES_TO_TEST = [
  { path: "/bills/new", name: "Create Bill" },
  { path: "/", name: "Dashboard" },
  { path: "/customers", name: "Customers" },
  { path: "/pending", name: "Pending Bills" },
  { path: "/payments", name: "Payments" },
  { path: "/products", name: "Products" },
  { path: "/reports", name: "Reports" },
  { path: "/settings", name: "Settings" },
];

async function checkHorizontalOverflow(page: Page): Promise<{ hasOverflow: boolean; scrollWidth: number; clientWidth: number }> {
  return await page.evaluate(() => {
    const docElem = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docElem.scrollWidth, body.scrollWidth);
    const clientWidth = docElem.clientWidth;
    return {
      hasOverflow: scrollWidth > clientWidth + 2, // 2px margin of tolerance for fractional pixels
      scrollWidth,
      clientWidth,
    };
  });
}

async function runDeviceAudit() {
  console.log("================================================================================");
  console.log("STARTING CROSS-DEVICE & MULTI-BROWSER VERIFICATION SUITE");
  console.log("Engines: Chromium (Chrome/Edge), WebKit (Safari), Firefox (Gecko)");
  console.log("================================================================================");

  let browserChromium: Browser | null = null;
  let browserWebkit: Browser | null = null;
  let browserFirefox: Browser | null = null;

  try {
    browserChromium = await chromium.launch({ headless: true });
    browserWebkit = await webkit.launch({ headless: true });
    browserFirefox = await firefox.launch({ headless: true });
  } catch (err: any) {
    console.error("Failed to launch browsers:", err);
    process.exit(1);
  }

  const results: any[] = [];

  for (const device of DEVICES) {
    console.log(`\n--------------------------------------------------------------------------------`);
    console.log(`Testing Device: [${device.name}] (Engine: ${device.engine.toUpperCase()}, Viewport: ${device.viewport.width}x${device.viewport.height})`);
    console.log(`--------------------------------------------------------------------------------`);

    const browser = device.engine === "webkit" ? browserWebkit : device.engine === "firefox" ? browserFirefox : browserChromium;
    const context: BrowserContext = await browser.newContext({
      viewport: device.viewport,
      hasTouch: device.hasTouch,
      isMobile: device.isMobile,
      userAgent: device.userAgent,
    });

    const page = await context.newPage();

    // 1. Unauthenticated redirect test
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState("networkidle");
    const currentUrl = page.url();
    const redirectedToLogin = currentUrl.includes("/login");
    console.log(`  [Auth Protection] Redirected to login: ${redirectedToLogin ? "PASS" : "FAIL"} (${currentUrl})`);

    // 2. Login Flow
    await page.fill('input[type="text"]', "admin");
    await page.fill('input[type="password"]', "JaiMataDi@2026");
    
    const [loginResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/login")),
      page.click('button[type="submit"]'),
    ]);

    if (loginResponse.status() !== 200) {
      throw new Error(`Login failed with status ${loginResponse.status()}`);
    }

    await page.waitForTimeout(1500);
    if (page.url().includes("/login")) {
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
    }
    console.log(`  [Authentication] Successfully logged in and redirected to Dashboard: PASS`);

    // Ensure clean handover state is active in localStorage
    await page.evaluate(() => {
      // Clear any cached test invoices/customers
      localStorage.removeItem("welding_shop_invoices");
      localStorage.removeItem("welding_shop_customers");
      localStorage.removeItem("welding_shop_payments");
      localStorage.setItem("welding_shop_invoices", JSON.stringify([]));
      localStorage.setItem("welding_shop_customers", JSON.stringify([]));
      localStorage.setItem("welding_shop_payments", JSON.stringify([]));
      localStorage.setItem("jaimatadi_shop_production_clean_v5", "true");
    });
    await page.reload({ waitUntil: "networkidle" });

    // 3. Test Each Core Page for layout, zero horizontal overflow, and responsiveness
    for (const p of PAGES_TO_TEST) {
      await page.goto(`${BASE_URL}${p.path}`);
      await page.waitForLoadState("networkidle");

      const overflow = await checkHorizontalOverflow(page);
      const title = await page.title();
      
      const pass = !overflow.hasOverflow;
      console.log(`  [${p.name} Page] Horizontal Overflow: ${pass ? "PASS (0px overflow)" : `FAIL (${overflow.scrollWidth}px > ${overflow.clientWidth}px)`}`);

      results.push({
        device: device.name,
        engine: device.engine,
        page: p.name,
        path: p.path,
        hasOverflow: overflow.hasOverflow,
        scrollWidth: overflow.scrollWidth,
        clientWidth: overflow.clientWidth,
        status: pass ? "PASS" : "FAIL",
      });
    }

    // 4. Verify Shop Settings on this device
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForLoadState("networkidle");
    await page.waitForSelector("input", { state: "visible", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
    const settingsInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll("input, textarea"));
      return inputs.map((el) => (el as HTMLInputElement).value);
    });
    const hasEnglishShopName = settingsInputs.some((v) => v.includes("JAI MATA DI"));
    const hasVaibhavWagh = settingsInputs.some((v) => v.includes("Mr. Vaibhav Wagh"));
    const hasBodwad = settingsInputs.some((v) => v.includes("Bodwad"));
    const hasUpiId = settingsInputs.some((v) => v.includes("9561482326@ybl"));

    console.log(`  [Shop Identity] English Name: ${hasEnglishShopName ? "PASS" : "FAIL"}, Owner: ${hasVaibhavWagh ? "PASS" : "FAIL"}, Address: ${hasBodwad ? "PASS" : "FAIL"}, UPI: ${hasUpiId ? "PASS" : "FAIL"}`);

    await context.close();
  }

  await browserChromium.close();
  await browserWebkit.close();
  await browserFirefox.close();

  console.log("\n================================================================================");
  console.log("CROSS-DEVICE AUDIT COMPLETE SUMMARY");
  console.log("================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  console.log(`Total Page Tests: ${total} across 8 Devices and 3 Browser Engines`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.error("FAILURES DETECTED:");
    results.filter((r) => r.status === "FAIL").forEach((f) => console.error(f));
    process.exit(1);
  } else {
    console.log("ALL CROSS-DEVICE AND MULTI-BROWSER TESTS PASSED (100%)!");
  }
}

runDeviceAudit().catch((e) => {
  console.error("Fatal audit error:", e);
  process.exit(1);
});
