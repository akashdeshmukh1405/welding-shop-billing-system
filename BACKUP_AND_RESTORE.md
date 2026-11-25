# Backup, Restore & Data Safety Manual

This document details the multi-layer safety and backup mechanisms built into the **Welding Shop Billing & POS System**.

---

## 1. 4-Tier Data Protection Architecture

| Layer | Type | Frequency | Location | Recovery Target |
|---|---|---|---|---|
| **Tier 1** | Supabase Cloud PostgreSQL Backup | Daily / Continuous | Customer Supabase Cloud | Point-in-time database restore |
| **Tier 2** | Independent Business Excel Reports | Weekly / On-demand | Customer Device / Flash drive | Business analysis, CA auditing |
| **Tier 3** | Complete Master Excel Backup (.xlsx) | Weekly / Monthly | Local Hard Drive / Cloud Drive | One-click total system restoration |
| **Tier 4** | Offline IndexedDB Cache | Real-time | Browser / iPad local storage | Immediate offline access & field billing |

---

## 2. Generating Independent Excel Exports

To export records for auditing, taxation, or personal records:
1. Open the application and go to **Settings** -> **Excel Backup & Reports**.
2. Under **Independent Business Reports (Excel)**, click any of the 4 download buttons:
   - 📊 **Pending Bills.xlsx**: Filtered by active dues, customer phone, pending balance, last payment date.
   - ✅ **Completed Bills.xlsx**: Filtered by status `PAID`, payment methods, total collections.
   - 💰 **Advance Payments.xlsx**: Advance payment receipts with remaining pending amounts.
   - 🧾 **All Transactions.xlsx**: Comprehensive transaction history with payment IDs and timestamps.

Each file is sorted **newest records at the top** and formatted cleanly for Microsoft Excel, Google Sheets, or LibreOffice.

---

## 3. Creating a Master Excel Database Backup

1. Navigate to **Settings** -> **Excel Backup & Reports**.
2. Click **Download Excel Backup (.xlsx)**.
3. The file `Jay_Mata_Di_Steel_Backup_YYYY-MM-DD.xlsx` will download to your device.
4. This workbook contains 6 structured worksheets:
   - `Invoices`: Master billing records.
   - `Invoice_Items`: Every line item, quantity, unit rate, and total.
   - `Customers`: Customer address, phone, GSTIN, and cumulative ledgers.
   - `Products`: Fabrication work rates, descriptions, and categories.
   - `Payments`: Individual payment transaction logs.
   - `Settings`: Shop profile, bank details, and invoice rules.

---

## 4. Restoring Database from Excel Backup

If you move to a new laptop, replace an iPad, or need to restore previous data:
1. Open the Billing Application on the new device.
2. Go to **Settings** -> **Excel Backup & Reports**.
3. Under **2. Upload & Validate Excel Backup File**, drag and drop your `.xlsx` backup file.
4. The system validates:
   - Sheet integrity (`Invoices`, `Invoice_Items`, `Customers`, etc.).
   - Math verification (`quantity * unitPrice == total`).
   - Customer phone uniqueness.
5. Review the **Data Preview**:
   - Check the summarized count of invoices, total billed amount, and customers.
6. Choose Restore Mode:
   - **Merge Records (Safe)**: Keeps existing records on this device and adds missing invoices from the backup.
   - **Replace Database**: Overwrites local database with the exact contents of the backup.
7. Click **Restore Database Now**.
8. A confetti banner confirms that the restoration completed with 100% data integrity.

---

## 5. Automated Cloud Backups in Supabase

Because you own your Supabase database:
1. Log in to [https://supabase.com](https://supabase.com).
2. Go to **Project Settings** -> **Database** -> **Backups**.
3. Supabase automatically runs scheduled daily backups with 1-click restore options.
4. You can also run `pg_dump` via terminal for standard PostgreSQL `.sql` snapshots whenever required.
