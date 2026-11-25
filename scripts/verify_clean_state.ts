import { initialCustomers, initialInvoices, initialPayments, initialProducts, initialShopSettings } from "../src/lib/seedData";
import { storageService } from "../src/services/storageService";

console.log("=== VERIFYING CLEAN HANDOVER STATE ===");
console.log(`Initial Customers count: ${initialCustomers.length}`);
console.log(`Initial Invoices count: ${initialInvoices.length}`);
console.log(`Initial Payments count: ${initialPayments.length}`);
console.log(`Initial Products count: ${initialProducts.length}`);
console.log(`Shop Name: ${initialShopSettings.shopName}`);
console.log(`Owner Name: ${initialShopSettings.ownerName}`);
console.log(`Shop Phone: ${initialShopSettings.shopPhone}`);
console.log(`Shop Address: ${initialShopSettings.shopAddress}`);
console.log(`Shop UPI ID: ${initialShopSettings.upiId}`);
console.log(`Starting Invoice Number: ${initialShopSettings.invoiceStartingNumber}`);
console.log(`Next Invoice Number: ${initialShopSettings.nextInvoiceNumber}`);

if (initialCustomers.length !== 0) throw new Error("Customers should be 0");
if (initialInvoices.length !== 0) throw new Error("Invoices should be 0");
if (initialPayments.length !== 0) throw new Error("Payments should be 0");
if (initialProducts.length !== 8) throw new Error("Products should be exactly 8");
if (initialShopSettings.nextInvoiceNumber !== 1001) throw new Error("Next invoice number should be 1001");

const nextInv = storageService.getNextInvoiceNumber();
console.log(`Computed Next Invoice Number on Clean Slate: ${nextInv}`);
if (nextInv !== "INV-1001") throw new Error(`Expected INV-1001, got ${nextInv}`);

console.log("SUCCESS: Clean state verified perfectly!");
