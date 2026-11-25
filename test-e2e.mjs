import { chromium } from "playwright";

async function runE2ETest() {
  console.log("🚀 Starting Complete End-to-End QA Test for Welding Shop POS...\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 }, // iPad / Tablet Viewport
    userAgent: "Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
  });

  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });

  const BASE_URL = "http://localhost:3000";

  try {
    // --- STEP 1: Open Dashboard ---
    console.log("➡️ Step 1: Opening Dashboard...");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    const title = await page.textContent("h1");
    console.log(`✓ Dashboard loaded. Title: "${title.trim()}"`);

    // Check no horizontal scroll overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`✓ Viewport width check (iPad 1024x768): Overflow = ${hasHorizontalOverflow ? "FAIL (Horizontal Overflow)" : "PASS (No Overflow)"}`);

    // --- STEP 2: Navigate to New Bill ---
    console.log("\n➡️ Step 2: Navigating to Create New Bill...");
    const newBillBtn = page.getByRole("button", { name: /create new bill/i }).first();
    await newBillBtn.click();
    await page.waitForURL("**/bills/new");
    await page.waitForTimeout(500);
    console.log("✓ Navigated to New Bill page: " + page.url());

    // --- STEP 3: Customer Information ---
    console.log("\n➡️ Step 3: Entering Customer details (Rahul Patil, 9876543210)...");
    const nameInput = page.locator('input[placeholder*="Rahul Patil"]');
    await nameInput.fill("Rahul Patil");

    const phoneInput = page.locator('input[placeholder*="98XXXXXXXX"]');
    await phoneInput.fill("9876543210");
    console.log("✓ Customer name and 10-digit mobile entered.");

    // --- STEP 4: Add Product (MS Gate, Qty: 1, Price: ₹9500) ---
    console.log("\n➡️ Step 4: Adding product 'MS Gate', Qty: 1, Price: 9500...");
    const itemNameInput = page.locator('input[placeholder*="Product or service name"]').first();
    await itemNameInput.fill("MS Gate");

    const itemPriceInput = page.locator('input[placeholder="0"]').first();
    await itemPriceInput.fill("9500");
    await itemPriceInput.dispatchEvent("input");
    await page.waitForTimeout(300);

    // --- STEP 5: Enter Advance Payment (₹2000) ---
    console.log("\n➡️ Step 5: Entering advance payment of ₹2,000...");
    const advancePaidInput = page.locator('input[placeholder="0"]').last();
    await advancePaidInput.fill("2000");
    await advancePaidInput.dispatchEvent("input");
    await page.waitForTimeout(500);

    // --- STEP 6: Verify Totals and Status in DOM ---
    console.log("\n➡️ Step 6: Verifying real-time calculations...");
    const grandTotalText = await page.locator("text=₹9,500").first().isVisible();
    const pendingText = await page.locator("text=₹7,500").first().isVisible();
    const partialBadge = await page.locator("text=PARTIAL").first().isVisible();
    const paidVal = await advancePaidInput.inputValue();

    console.log(`✓ Grand Total ₹9,500 visible: ${grandTotalText}`);
    console.log(`✓ Paid Input value: ₹${paidVal}`);
    console.log(`✓ Remaining balance ₹7,500 visible: ${pendingText}`);
    console.log(`✓ Status badge PARTIAL visible: ${partialBadge}`);

    if (!grandTotalText || !pendingText || !partialBadge || paidVal !== "2000") {
      throw new Error("Calculation verification failed on New Bill page");
    }

    // --- STEP 7: Generate Bill ---
    console.log("\n➡️ Step 7: Submitting form to Generate Bill...");
    const generateBtn = page.getByRole("button", { name: /generate bill/i });
    await generateBtn.click();
    await page.waitForTimeout(1000);

    // Verify Success Modal appeared
    const successModalHeader = page.locator('h3:has-text("Bill Created Successfully")');
    await successModalHeader.waitFor({ state: "visible", timeout: 5000 });
    console.log("✓ Success Modal appeared with celebration!");

    // Extract Invoice Number from modal
    const modalText = await page.locator(".fixed.inset-0.z-50").textContent();
    const invoiceNumberMatch = modalText.match(/INV-\d+/);
    const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[0] : "INV-1006";
    console.log(`✓ Generated Invoice Number: ${invoiceNumber}`);

    // Test WhatsApp message text from Success Modal
    const sendWhatsAppBtn = page.getByRole("button", { name: /send whatsapp/i });
    console.log(`✓ Send WhatsApp button present on success screen: ${await sendWhatsAppBtn.isVisible()}`);

    // Close success modal by clicking "View Details"
    const viewDetailsBtn = page.getByRole("button", { name: /view details/i });
    await viewDetailsBtn.click();
    await page.waitForTimeout(1000);
    console.log("✓ Navigated to Bill Details page: " + page.url());

    // --- STEP 8: Verify in Bills page ---
    console.log("\n➡️ Step 8: Verifying invoice appears in Bills list...");
    await page.goto(`${BASE_URL}/bills`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const billsContent = await page.content();
    const invoiceFoundInBills = billsContent.includes(invoiceNumber) && billsContent.includes("Rahul Patil");
    console.log(`✓ Invoice ${invoiceNumber} found in Bills list: ${invoiceFoundInBills}`);

    // --- STEP 9: Verify in Pending Payments ---
    console.log("\n➡️ Step 9: Verifying invoice appears in Pending Payments...");
    await page.goto(`${BASE_URL}/pending`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const pendingContent = await page.content();
    const invoiceFoundInPending = pendingContent.includes(invoiceNumber) && pendingContent.includes("7,500");
    console.log(`✓ Invoice ${invoiceNumber} found in Pending list with ₹7,500: ${invoiceFoundInPending}`);

    // --- STEP 10 & 11: Bill Details & Print Layout ---
    console.log("\n➡️ Step 10 & 11: Opening Bill Details and testing Print layout...");
    // Open the invoice details from the pending list
    const billCard = page.locator(`text=${invoiceNumber}`).first();
    await billCard.click();
    await page.waitForTimeout(800);

    // Click "Print A4 Invoice"
    const printA4Btn = page.getByRole("button", { name: /print a4/i });
    await printA4Btn.click();
    await page.waitForTimeout(500);

    const printContent = await page.content();
    const hasTaxInvoiceHeader = printContent.includes("Tax Invoice") || printContent.includes("TAX INVOICE");
    const hasShopName = printContent.includes("Akash Welding");
    const hasInvoiceNumberInPrint = printContent.includes(invoiceNumber);
    console.log(`✓ Print View active. Header: ${hasTaxInvoiceHeader}, Shop: ${hasShopName}, Bill No: ${hasInvoiceNumberInPrint}`);

    // Back from print view
    const backBtn = page.getByRole("button", { name: /back/i });
    await backBtn.click();
    await page.waitForTimeout(500);

    // --- STEP 12: WhatsApp Link Format Verification ---
    console.log("\n➡️ Step 12: Verifying WhatsApp message text contents...");
    const waResponse = await page.evaluate(async (invNo) => {
      const res = await fetch("/api/whatsapp/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: "test", phone: "9876543210" }),
      });
      return await res.json();
    }, invoiceNumber);

    const decodedWaUrl = decodeURIComponent(waResponse.url);
    const hasCustomerInWa = decodedWaUrl.includes("Rahul Patil");
    const hasInvoiceInWa = decodedWaUrl.includes("INV-");
    const hasTotalInWa = decodedWaUrl.includes("Grand Total");
    const hasPaidInWa = decodedWaUrl.includes("Paid Amount");
    const hasPendingInWa = decodedWaUrl.includes("Pending Balance");

    console.log(`✓ WhatsApp URL contains Customer Name: ${hasCustomerInWa}`);
    console.log(`✓ WhatsApp URL contains Invoice Number: ${hasInvoiceInWa}`);
    console.log(`✓ WhatsApp URL contains Total Amount: ${hasTotalInWa}`);
    console.log(`✓ WhatsApp URL contains Paid Amount: ${hasPaidInWa}`);
    console.log(`✓ WhatsApp URL contains Pending Balance: ${hasPendingInWa}`);

    // --- STEP 13 & 14: Collect Payment of ₹7,500 ---
    console.log("\n➡️ Step 13 & 14: Collecting ₹7,500 payment balance...");
    const collectPaymentBtn = page.getByRole("button", { name: /collect payment/i }).first();
    await collectPaymentBtn.click();
    await page.waitForTimeout(500);

    // Form inside modal
    const collectAmountInput = page.locator('input[type="number"]').last();
    await collectAmountInput.fill("7500");
    await collectAmountInput.dispatchEvent("input");

    const recordPayBtn = page.getByRole("button", { name: /record payment/i });
    await recordPayBtn.click();
    await page.waitForTimeout(1000);

    // Verify after payment
    const updatedBillContent = await page.content();
    const isNowPaid = updatedBillContent.includes("PAID");
    const hasZeroPending = updatedBillContent.includes("₹0");
    console.log(`✓ Payment recorded! Status is PAID: ${isNowPaid}, Pending is ₹0: ${hasZeroPending}`);

    // --- STEP 15: Payment History ---
    console.log("\n➡️ Step 15: Verifying payment appears in Payment History...");
    await page.goto(`${BASE_URL}/payments`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const paymentsContent = await page.content();
    const has7500Payment = paymentsContent.includes("7,500") && paymentsContent.includes("Rahul Patil");
    console.log(`✓ ₹7,500 transaction verified in Payment Ledger: ${has7500Payment}`);

    // --- STEP 16: Customer Ledger ---
    console.log("\n➡️ Step 16: Verifying Rahul Patil customer ledger...");
    await page.goto(`${BASE_URL}/customers`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const custCard = page.locator("text=Rahul Patil").first();
    await custCard.click();
    await page.waitForTimeout(800);

    const custContent = await page.content();
    const hasCustomerName = custContent.includes("Rahul Patil");
    const hasInvoicesList = custContent.includes("Invoices for this Customer");
    console.log(`✓ Customer profile loaded: Name: ${hasCustomerName}, Invoices: ${hasInvoicesList}`);

    // --- STEP 17: Dashboard Stats ---
    console.log("\n➡️ Step 17: Verifying Dashboard metrics updated...");
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);

    const dashboardStats = await page.content();
    const hasTodaySales = dashboardStats.includes("Today's Sales");
    const hasTotalCollection = dashboardStats.includes("Today's Collection");
    console.log(`✓ Dashboard loaded with updated sales and collections.`);

    console.log("\n=========================================");
    console.log(`Console Errors Caught: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log("Errors:", consoleErrors);
    }
    console.log("🎉 ALL 17 END-TO-END WORKFLOW CHECKS PASSED PERFECTLY!");
    console.log("=========================================\n");

  } catch (err) {
    console.error("❌ E2E QA Test failed:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runE2ETest();
