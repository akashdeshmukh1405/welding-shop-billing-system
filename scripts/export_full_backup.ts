import fs from 'fs';
import { initialCustomers, initialInvoices, initialPayments, initialProducts, initialShopSettings } from '../src/lib/seedData.js';

const fullArchive = {
  metadata: {
    title: "Complete Pre-Handover Test Data Archive",
    exportDate: new Date().toISOString(),
    shopSettings: initialShopSettings,
  },
  products: initialProducts,
  customers: initialCustomers,
  invoices: initialInvoices,
  payments: initialPayments,
};

fs.writeFileSync('backups/full_archive_pre_clean.json', JSON.stringify(fullArchive, null, 2), 'utf8');
console.log(`✅ Full Pre-Clean Archive created at backups/full_archive_pre_clean.json (${initialInvoices.length} invoices, ${initialCustomers.length} customers, ${initialPayments.length} payments, ${initialProducts.length} approved products)`);
