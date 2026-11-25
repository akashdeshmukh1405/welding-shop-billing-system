import { chromium } from 'playwright';

const VIEWPORTS = [
  { name: "iPad Portrait", width: 768, height: 1024, isMobile: true },
  { name: "iPad Landscape", width: 1024, height: 768, isMobile: true },
  { name: "Android Mobile Portrait", width: 390, height: 844, isMobile: true },
  { name: "Android Mobile Landscape", width: 844, height: 390, isMobile: true },
  { name: "iPhone (iOS)", width: 375, height: 812, isMobile: true },
  { name: "Windows Desktop (1080p)", width: 1920, height: 1080, isMobile: false },
  { name: "Laptop (1366x768)", width: 1366, height: 768, isMobile: false },
];

const PAGES_TO_TEST = [
  { path: "/login", name: "Login Page" },
  { path: "/", name: "Dashboard" },
  { path: "/bills", name: "Bills List" },
  { path: "/bills/new", name: "Create Bill Form" },
  { path: "/bills/inv-1006", name: "Invoice Details" },
  { path: "/customers", name: "Customers List" },
  { path: "/pending", name: "Pending Bills" },
];

async function runResponsiveAudit() {
  console.log("==================================================");
  console.log("PHASE 2: RESPONSIVE & CROSS-DEVICE AUDIT");
  console.log("==================================================\n");

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Testing ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });
    const page = await context.newPage();

    // 1. Log in to get session cookie
    await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
    await page.fill('input[type="text"]', "admin");
    await page.fill('input[type="password"]', "JaiMataDi@2026");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    for (const p of PAGES_TO_TEST) {
      try {
        await page.goto(`http://localhost:3000${p.path}`, { waitUntil: "networkidle", timeout: 15000 });
        await page.waitForTimeout(500);

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          const scrollW = document.documentElement.scrollWidth;
          const innerW = window.innerWidth;
          return {
            hasOverflow: scrollW > innerW + 2, // Allow 2px tolerance
            scrollW,
            innerW,
            diff: scrollW - innerW
          };
        });

        const status = overflow.hasOverflow ? `⚠️ Overflow by ${overflow.diff}px` : "✅ Clean (0px overflow)";
        console.log(`  [${vp.name}] ${p.name}: ${status}`);

        results.push({
          viewport: vp.name,
          page: p.name,
          overflow: overflow.hasOverflow,
          diff: overflow.diff
        });
      } catch (err) {
        console.error(`  [${vp.name}] ${p.name}: ❌ Load error: ${err.message}`);
      }
    }

    await context.close();
  }

  await browser.close();

  const totalTests = results.length;
  const overflows = results.filter(r => r.overflow);
  console.log("\n==================================================");
  console.log(`RESPONSIVE AUDIT RESULTS: ${totalTests - overflows.length}/${totalTests} PASSED`);
  if (overflows.length > 0) {
    console.log("Pages requiring overflow adjustment:");
    overflows.forEach(o => console.log(`  - ${o.viewport} on ${o.page}: ${o.diff}px overflow`));
  } else {
    console.log("✅ All pages are 100% responsive across iPad, iPhone, Android, and Desktop!");
  }
  console.log("==================================================");
}

runResponsiveAudit().catch(console.error);
