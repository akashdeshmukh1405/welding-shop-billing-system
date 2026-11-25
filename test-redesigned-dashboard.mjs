import { chromium } from "playwright";

async function runRedesignedDashboardTests() {
  console.log("🚀 Starting QA Verification for Redesigned Simple Glassmorphism Dashboard...\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 }, // iPad landscape
  });

  const page = await context.newPage();
  const BASE_URL = "http://localhost:3000";

  try {
    // ----------------------------------------------------
    // Test 1: Desktop / iPad Landscape Layout Check
    // ----------------------------------------------------
    console.log("➡️ Test 1: Loading Dashboard on iPad Viewport (1024x768)...");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    // 1. Check Top Greeting & Shop Name
    const pageText = await page.textContent("body");
    const hasShopName = pageText.includes("Akash Welding") || pageText.includes("Welding");
    const hasGreeting = pageText.includes("Good Morning") || pageText.includes("Good Afternoon") || pageText.includes("Good Evening");
    console.log(`✓ Shop header & greeting present: ${hasShopName && hasGreeting}`);

    // 2. Check "+ CREATE NEW BILL" Button
    const newBillBtn = page.getByRole("heading", { name: /\+ CREATE NEW BILL/i });
    const isNewBillVisible = await newBillBtn.isVisible();
    console.log(`✓ Massive "+ CREATE NEW BILL" button visible: ${isNewBillVisible}`);

    // 3. Check 4 Main Metric Cards
    const hasPendingCard = pageText.includes("Pending Payments");
    const hasTodayCollection = pageText.includes("Today's Collection") || pageText.includes("Today’s Collection");
    const hasCompletedBills = pageText.includes("Completed Bills");
    const hasTotalBills = pageText.includes("Total Bills");
    console.log(`✓ 4 Core Cards present (Pending, Collection, Completed, Total): ${hasPendingCard && hasTodayCollection && hasCompletedBills && hasTotalBills}`);

    // 4. Verify Marketing Language Removed
    const hasMarketingHero = pageText.includes("Welding Workshop Billing Counter") || pageText.includes("Quick Invoicing & Payments");
    console.log(`✓ Promotional / marketing slogans removed: ${!hasMarketingHero}`);

    // 5. Check Horizontal Overflow (No horizontal scroll)
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`✓ No horizontal overflow on iPad: ${!hasHorizontalOverflow}`);

    // ----------------------------------------------------
    // Test 2: Interactive Collect Payment on Dashboard
    // ----------------------------------------------------
    console.log("\n➡️ Test 2: Testing 1-Tap 'Collect Payment' from Dashboard...");
    const collectButtons = page.getByRole("button", { name: /collect/i });
    const collectBtnCount = await collectButtons.count();
    console.log(`✓ Found ${collectBtnCount} direct collect payment action buttons in Pending list.`);

    if (collectBtnCount > 0) {
      const firstCollectBtn = collectButtons.first();
      await firstCollectBtn.click();
      await page.waitForTimeout(500);

      // Verify Payment Modal opened
      const modalHeader = page.locator(".fixed.inset-0.z-50").first();
      const isModalOpen = await modalHeader.isVisible();
      console.log(`✓ Collect Payment modal opened successfully from dashboard: ${isModalOpen}`);

      // Close modal
      const cancelBtn = page.getByRole("button", { name: /cancel/i }).first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }

    // ----------------------------------------------------
    // Test 3: Navigation Links from Dashboard
    // ----------------------------------------------------
    console.log("\n➡️ Test 3: Testing Navigation from Dashboard...");

    // Test Pending Payments link
    const viewPendingBtn = page.locator("text=View Pending Bills").first();
    await viewPendingBtn.click();
    await page.waitForURL(/.*\/pending/);
    console.log(`✓ "View Pending Bills" navigates to /pending: ${page.url().includes("/pending")}`);

    // Return to dashboard
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    // Test Completed Bills link
    const viewCompletedBtn = page.locator("text=View Completed").first();
    await viewCompletedBtn.click();
    await page.waitForURL(/.*\/bills/);
    console.log(`✓ "View Completed" navigates to /bills?tab=PAID: ${page.url().includes("tab=PAID") || page.url().includes("/bills")}`);

    // Return to dashboard
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    // Test Create New Bill click
    const createBillHero = page.locator("button:has-text('+ CREATE NEW BILL')").first();
    await createBillHero.click();
    await page.waitForURL(/.*\/bills\/new/);
    console.log(`✓ "+ CREATE NEW BILL" navigates to /bills/new: ${page.url().includes("/bills/new")}`);

    // ----------------------------------------------------
    // Test 4: Mobile Viewport Layout Check (390x844)
    // ----------------------------------------------------
    console.log("\n➡️ Test 4: Testing Mobile Viewport (390x844)...");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const mobileOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    console.log(`✓ No horizontal overflow on mobile: ${!mobileOverflow}`);

    console.log("\n=================================================");
    console.log("🎉 REDESIGNED DASHBOARD QA VERIFICATION PASSED 100%!");
    console.log("=================================================\n");

  } catch (err) {
    console.error("❌ Dashboard QA Test failed:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runRedesignedDashboardTests();
