import { storageService } from '../src/services/storageService.js';
import { customerService } from '../src/services/customerService.js';
import { invoiceService } from '../src/services/invoiceService.js';
import { paymentService } from '../src/services/paymentService.js';

// We run this with tsx so we can import TypeScript services directly
console.log("==================================================");
console.log("PHASE 4: CUSTOMER LEDGER & KHATABOOK AUDIT");
console.log("==================================================\n");

// Step 1: Create or find customer Ramesh Patil
console.log("Step 1: Setting up Customer Ramesh Patil (Mobile: 9000000001)...");
let ramesh = customerService.getCustomerByPhone("9000000001");
if (!ramesh) {
  ramesh = customerService.createCustomer({
    name: "Ramesh Patil",
    phone: "9000000001",
    address: "Main Road, Bodwad",
    notes: "Regular welding customer"
  });
  console.log(`✅ Created customer: ${ramesh.name} (${ramesh.id})`);
} else {
  console.log(`ℹ️ Customer already exists: ${ramesh.name} (${ramesh.id})`);
}

// Step 2: Create initial bill of ₹8,000 (pending balance ₹8,000)
console.log("\nStep 2: Creating previous invoice #1 (Total: ₹8,000, Unpaid)...");
const inv1 = invoiceService.createInvoice({
  customerId: ramesh.id,
  customerName: ramesh.name,
  customerPhone: ramesh.phone,
  date: "2026-08-15",
  items: [
    {
      name: "Iron Gate Fabrication",
      quantity: 1,
      unit: "nos",
      unitPrice: 8000,
      total: 8000
    }
  ],
  subtotal: 8000,
  discountType: "fixed",
  discountValue: 0,
  discountAmount: 0,
  grandTotal: 8000,
  paidAmount: 0,
  pendingAmount: 8000,
  primaryPaymentMethod: "CASH",
  notes: "Initial gate work"
});
console.log(`✅ Created Invoice ${inv1.invoiceNumber}: Grand Total ₹${inv1.grandTotal}, Pending ₹${inv1.pendingAmount}`);

// Check ledger balance after Bill 1
let ledgerData = customerService.getCustomerLedger(ramesh.id);
console.log(`  Current Outstanding Balance: ₹${ledgerData.consolidatedBalance}`);
if (ledgerData.consolidatedBalance === 8000) {
  console.log("  ✅ Initial balance verified: ₹8,000");
} else {
  console.error("  ❌ Unexpected balance:", ledgerData.consolidatedBalance);
}

// Step 3: Son visits shop and gives father's mobile number 9000000001
console.log("\nStep 3: Son visits and gives mobile 9000000001. Testing Account Detection...");
const match = customerService.searchCustomerByAnyPhone("9000000001");
if (match && match.customer.id === ramesh.id) {
  console.log(`✅ Found existing account for mobile: ${match.customer.name} (Matched via ${match.matchedVia})`);
  console.log(`   Outstanding balance displayed before new bill: ₹${match.customer.totalPending}`);
} else {
  console.error("❌ Failed to detect existing customer account by phone");
}

// Link son as family contact
console.log("\nStep 4: Linking Son Suresh Patil (9000000002) to Ramesh's Account...");
try {
  const linked = customerService.linkFamilyContact(ramesh.id, {
    name: "Suresh Patil",
    phone: "9000000002",
    relationship: "Son"
  });
  if (linked) ramesh = linked;
  console.log("✅ Son linked as family contact successfully.");
} catch (e) {
  console.log("ℹ️ Family contact already linked or noted:", e.message);
}

// Step 5: Create new invoice for ₹5,000 under Ramesh's account
console.log("\nStep 5: Creating new invoice #2 for ₹5,000 (New Work)...");
const inv2 = invoiceService.createInvoice({
  customerId: ramesh.id,
  customerName: ramesh.name,
  customerPhone: ramesh.phone,
  date: "2026-08-20",
  items: [
    {
      name: "Balcony Railing Repair & Polishing",
      quantity: 1,
      unit: "nos",
      unitPrice: 5000,
      total: 5000
    }
  ],
  subtotal: 5000,
  discountType: "fixed",
  discountValue: 0,
  discountAmount: 0,
  grandTotal: 5000,
  paidAmount: 0,
  pendingAmount: 5000,
  primaryPaymentMethod: "CASH",
  notes: "Ordered by son Suresh Patil"
});
console.log(`✅ Created Invoice ${inv2.invoiceNumber}: Grand Total ₹${inv2.grandTotal}, Pending ₹${inv2.pendingAmount}`);

// Verify expected outstanding = ₹8,000 + ₹5,000 = ₹13,000
ledgerData = customerService.getCustomerLedger(ramesh.id);
console.log(`  Consolidated Total Billed: ₹${ledgerData.totalBilled}`);
console.log(`  Consolidated Outstanding: ₹${ledgerData.consolidatedBalance}`);
if (ledgerData.consolidatedBalance === 13000) {
  console.log("✅ Expected outstanding ₹13,000 PASSED (8,000 + 5,000 = 13,000)");
} else {
  console.error(`❌ Expected ₹13,000 but got ₹${ledgerData.consolidatedBalance}`);
}

// Step 6: Record a payment of ₹3,000
console.log("\nStep 6: Recording payment of ₹3,000 against customer account...");
const paymentResult = paymentService.collectPayment({
  invoiceId: inv1.id,
  amount: 3000,
  paymentMethod: "CASH",
  date: "2026-08-22",
  referenceNote: "Payment received from son Suresh Patil"
});

if (!paymentResult.success || !paymentResult.payment) {
  console.error("❌ Failed to collect payment:", paymentResult.error);
  process.exit(1);
}

const payment = paymentResult.payment;
console.log(`✅ Payment recorded: ID ${payment.id}, Amount ₹${payment.amount}`);

// Step 7: Verify final expected outstanding = ₹10,000
ledgerData = customerService.getCustomerLedger(ramesh.id);
console.log(`\nStep 7: Verifying Consolidated Ledger...`);
console.log(`  Total Billed: ₹${ledgerData.totalBilled}`);
console.log(`  Total Paid:   ₹${ledgerData.totalPaid}`);
console.log(`  Balance Due:  ₹${ledgerData.consolidatedBalance}`);

if (ledgerData.consolidatedBalance === 10000) {
  console.log("✅ Expected final outstanding ₹10,000 PASSED (13,000 - 3,000 = 10,000)");
} else {
  console.error(`❌ Expected ₹10,000 but got ₹${ledgerData.consolidatedBalance}`);
}

// Verify both invoices and payment exist in the ledger
console.log("\nLedger Entries Chronology:");
ledgerData.ledger.forEach((entry, idx) => {
  console.log(`  ${idx + 1}. [${entry.date}] ${entry.type} - ${entry.description} | Debit: ₹${entry.debit} | Credit: ₹${entry.credit} | Running Balance: ₹${entry.runningBalance}`);
});

const billEntries = ledgerData.ledger.filter(e => e.type === 'BILL');
const payEntries = ledgerData.ledger.filter(e => e.type === 'PAYMENT');
if (billEntries.length >= 2 && payEntries.length >= 1) {
  console.log("✅ All invoices and payment entries are preserved in the single customer ledger!");
}

console.log("\n==================================================");
console.log("CUSTOMER LEDGER AUDIT COMPLETED SUCCESSFULLY");
console.log("==================================================");
