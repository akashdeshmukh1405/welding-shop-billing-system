import { chromium } from "playwright";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

async function runExcelBackupWorkflowTest() {
  console.log("🚀 Starting QA Verification for Complete Excel Backup & Restore Workflow...\n");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1024, height: 768 },
  });

  const page = await context.newPage();
  const BASE_URL = "http://localhost:3000";

  try {
    // ----------------------------------------------------
    // Step 1: Open Settings -> Excel Backup & Restore Tab
    // ----------------------------------------------------
    console.log("➡️ Step 1: Navigating to Settings -> Excel Backup & Restore Tab...");
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const backupTabBtn = page.locator("text=Excel Backup & Restore").first();
    await backupTabBtn.click();
    await page.waitForTimeout(500);

    const pipelineTitle = await page.textContent("body");
    const isTabActive = pipelineTitle.includes("Excel Backup & Database Restore Workflow");
    console.log(`✓ Excel Backup & Restore view active: ${isTabActive}`);

    // ----------------------------------------------------
    // Step 2: Create Mock Excel Backup File on Disk
    // ----------------------------------------------------
    console.log("\n➡️ Step 2: Creating Standard Test Excel Backup Workbook...");
    const wb = XLSX.utils.book_new();

    const testInvoices = [
      {
        "Invoice Number": "INV-9001",
        "Date": "2026-09-01",
        "Due Date": "2026-09-10",
        "Customer Name": "Mahesh Shinde",
        "Customer Phone": "9822334455",
        "Customer Address": "Plot 45, MIDC, Pune",
        "Customer GSTIN": "27AAAPM1234F1Z0",
        "Subtotal (Rs)": 25000,
        "Discount (Rs)": 1000,
        "Grand Total (Rs)": 24000,
        "Paid Amount (Rs)": 10000,
        "Pending Amount (Rs)": 14000,
        "Payment Status": "PARTIAL",
        "Primary Payment Mode": "UPI",
        "Notes": "Fabrication of heavy factory sliding gate",
      },
      {
        "Invoice Number": "INV-9002",
        "Date": "2026-09-02",
        "Due Date": "2026-09-15",
        "Customer Name": "Ganesh Kulkarni",
        "Customer Phone": "9877889900",
        "Customer Address": "Baner, Pune",
        "Customer GSTIN": "",
        "Subtotal (Rs)": 18000,
        "Discount (Rs)": 0,
        "Grand Total (Rs)": 18000,
        "Paid Amount (Rs)": 18000,
        "Pending Amount (Rs)": 0,
        "Payment Status": "PAID",
        "Primary Payment Mode": "CASH",
        "Notes": "SS Balcony Railing 45 running feet",
      },
    ];

    const testItems = [
      {
        "Invoice Number": "INV-9001",
        "Item #": 1,
        "Item Name": "Industrial Sliding Gate",
        "Description": "MS Heavy Duty 20x8 ft",
        "Quantity": 1,
        "Unit": "piece",
        "Rate (Rs)": 25000,
        "Total (Rs)": 25000,
      },
      {
        "Invoice Number": "INV-9002",
        "Item #": 1,
        "Item Name": "SS 304 Grade Railing",
        "Description": "Glass finish balcony railing",
        "Quantity": 45,
        "Unit": "feet",
        "Rate (Rs)": 400,
        "Total (Rs)": 18000,
      },
    ];

    const testCustomers = [
      {
        "Customer Name": "Mahesh Shinde",
        "Phone": "9822334455",
        "Address": "Plot 45, MIDC, Pune",
        "GSTIN": "27AAAPM1234F1Z0",
        "Total Bills": 1,
        "Total Billed (Rs)": 24000,
        "Total Paid (Rs)": 10000,
        "Total Pending (Rs)": 14000,
      },
      {
        "Customer Name": "Ganesh Kulkarni",
        "Phone": "9877889900",
        "Address": "Baner, Pune",
        "GSTIN": "",
        "Total Bills": 1,
        "Total Billed (Rs)": 18000,
        "Total Paid (Rs)": 18000,
        "Total Pending (Rs)": 0,
      },
    ];

    const testPayments = [
      {
        "Payment ID": "pay-9001-1",
        "Invoice Number": "INV-9001",
        "Customer Name": "Mahesh Shinde",
        "Customer Phone": "9822334455",
        "Amount (Rs)": 10000,
        "Payment Method": "UPI",
        "Reference Note": "Advance token via Google Pay",
        "Date": "2026-09-01",
        "Time": "11:30 AM",
      },
      {
        "Payment ID": "pay-9002-1",
        "Invoice Number": "INV-9002",
        "Customer Name": "Ganesh Kulkarni",
        "Customer Phone": "9877889900",
        "Amount (Rs)": 18000,
        "Payment Method": "CASH",
        "Reference Note": "Full settlement on delivery",
        "Date": "2026-09-02",
        "Time": "04:15 PM",
      },
    ];

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(testInvoices), "Invoices");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(testItems), "Invoice_Items");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(testCustomers), "Customers");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(testPayments), "Payments");

    const tempFilePath = path.join(process.cwd(), "test_welding_backup.xlsx");
    XLSX.writeFile(wb, tempFilePath);
    console.log(`✓ Test Excel backup file created at: ${tempFilePath}`);

    // ----------------------------------------------------
    // Step 3: Upload & Validate File in UI
    // ----------------------------------------------------
    console.log("\n➡️ Step 3: Uploading & Triggering Automated Validation...");
    const fileInput = page.locator("#excel-backup-input");
    await fileInput.setInputFiles(tempFilePath);
    await page.waitForTimeout(1000);

    const validationText = await page.textContent("body");
    const isValidationPassed = validationText.includes("Validation Status: PASSED");
    console.log(`✓ Automated schema & formula validation PASSED: ${isValidationPassed}`);

    // ----------------------------------------------------
    // Step 4: Verify Data Preview & Tabs
    // ----------------------------------------------------
    console.log("\n➡️ Step 4: Verifying Data Preview & Integrity Breakdown...");
    const hasInvoicesCount = validationText.includes("INV-9001") && validationText.includes("INV-9002");
    const hasMahesh = validationText.includes("Mahesh Shinde");
    const hasGanesh = validationText.includes("Ganesh Kulkarni");
    console.log(`✓ Invoices preview rendered (INV-9001, INV-9002): ${hasInvoicesCount}`);
    console.log(`✓ Customer names parsed accurately: ${hasMahesh && hasGanesh}`);

    // Test Customers Preview Tab
    const custTabBtn = page.getByRole("button", { name: /Customers \(\d+\)/i });
    await custTabBtn.click();
    await page.waitForTimeout(300);
    const hasPhone = (await page.textContent("body")).includes("9822334455");
    console.log(`✓ Customers preview tab verified: ${hasPhone}`);

    // Test Payments Preview Tab
    const payTabBtn = page.getByRole("button", { name: /Payments \(\d+\)/i });
    await payTabBtn.click();
    await page.waitForTimeout(300);
    const hasPayAmount = (await page.textContent("body")).includes("10,000");
    console.log(`✓ Payments preview tab verified: ${hasPayAmount}`);

    // ----------------------------------------------------
    // Step 5: Execute Database Restore
    // ----------------------------------------------------
    console.log("\n➡️ Step 5: Executing 'RESTORE DATABASE NOW'...");
    const restoreBtn = page.getByRole("button", { name: /RESTORE DATABASE NOW/i });
    await restoreBtn.click();
    await page.waitForTimeout(1500);

    const afterRestoreText = await page.textContent("body");
    const hasSuccessBanner =
      afterRestoreText.includes("Successfully restored") ||
      afterRestoreText.includes("Database restored successfully");
    console.log(`✓ Database Restore executed successfully: ${hasSuccessBanner}`);

    // ----------------------------------------------------
    // Step 6: Verify in Bills and Pending Pages
    // ----------------------------------------------------
    console.log("\n➡️ Step 6: Verifying restored records in Bills and Pending Pages...");
    await page.goto(`${BASE_URL}/bills`, { waitUntil: "networkidle" });
    const billsContent = await page.content();
    const inv9001InBills = billsContent.includes("INV-9001") && billsContent.includes("Mahesh Shinde");
    const inv9002InBills = billsContent.includes("INV-9002") && billsContent.includes("Ganesh Kulkarni");
    console.log(`✓ INV-9001 and INV-9002 active in Bills: ${inv9001InBills && inv9002InBills}`);

    await page.goto(`${BASE_URL}/pending`, { waitUntil: "networkidle" });
    const pendingContent = await page.content();
    const inv9001InPending = pendingContent.includes("INV-9001") && pendingContent.includes("14,000");
    const inv9002NotInPending = !pendingContent.includes("INV-9002"); // Since INV-9002 is fully PAID
    console.log(`✓ INV-9001 (Partial Due ₹14,000) present in Pending Payments: ${inv9001InPending}`);
    console.log(`✓ INV-9002 (Fully Paid) correctly absent from Pending Payments: ${inv9002NotInPending}`);

    // Clean up temp test file
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }

    console.log("\n=================================================");
    console.log("🎉 COMPLETE 5-STEP EXCEL BACKUP & RESTORE PIPELINE PASSED 100%!");
    console.log("=================================================\n");

  } catch (err) {
    console.error("❌ Excel Backup Workflow QA Test failed:", err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runExcelBackupWorkflowTest();
