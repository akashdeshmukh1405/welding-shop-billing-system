# Database Migration & Data Preservation Guide

This guide ensures that when the customer connects their Supabase PostgreSQL database, **zero existing invoice records or customer ledgers are lost**.

---

## 1. Migration Philosophy & Safeguards

- **Never Overwrite Without Validation**: Existing bills (`INV-1001`, `INV-1002`, `INV-1006`, etc.) must remain intact.
- **Conflict Handling**: The migration engine uses SQL `ON CONFLICT (invoice_number) DO UPDATE` and `ON CONFLICT (phone) DO UPDATE` to preserve historical consistency while updating any missing linked items.
- **Audit Logging**: Every migration operation is logged into the `backup_logs` table in Supabase.

---

## 2. Migration Method A: One-Click Web UI Sync (Recommended)

1. Connect your Supabase project in `.env.local` as described in `SUPABASE_SETUP.md`.
2. Open the Billing Application in your browser: `http://localhost:3000` (or production domain).
3. Go to **Settings** (gear icon) -> click **Database & Cloud Ownership**.
4. Check that status shows **Customer Supabase PostgreSQL Connected**.
5. Click the blue button: **Sync Local Records to Cloud**.
6. The system will:
   - Synchronize your workshop settings (`जय माता दी`, phone `9561482326`, UPI `9561482326@ybl`).
   - Create or update all customers with phone numbers and calculated billing totals.
   - Synchronize product catalog items.
   - Create all invoice records with line items.
   - Synchronize all payment receipts.
7. A success banner will confirm the exact count of records transferred.

---

## 3. Migration Method B: Multi-Sheet Excel Backup & Restore

If you are moving records between two different devices or computers:

1. On the source device:
   - Navigate to **Settings** -> **Excel Backup & Restore**.
   - Click **Download Excel Backup (.xlsx)**.
   - Saves a complete file named `Jay_Mata_Di_Steel_Backup_YYYY-MM-DD.xlsx`.
2. On the destination device:
   - Navigate to **Settings** -> **Excel Backup & Restore**.
   - Under **Upload Excel File**, drag and drop or select your `.xlsx` backup file.
   - The system automatically validates data integrity and verifies that line items balance.
   - Select **Merge Records** (retains existing entries while adding new bills) or **Replace Database** (clean overwrite).
   - Click **Restore Database Now**.

---

## 4. Migration Verification Checklist

After migrating, verify the following records in the application:
1. **Bills List (`/bills`)**:
   - Check that `INV-1006` (or highest bill) appears with correct Grand Total and Status.
2. **Pending Payments (`/pending`)**:
   - Verify that bills with outstanding balances (e.g. `INV-1001`, `INV-1004`) appear with correct remaining amounts.
   - Verify that settled bills (`PAID`) do **not** appear under pending.
3. **Customer Ledger (`/customers`)**:
   - Check customer names (e.g. `Rahul Patil`, `Suresh Jadhav`) and verify that `Total Billed`, `Total Paid`, and `Balance Due` match exactly.
4. **Excel Export (`/settings`)**:
   - Download `Pending Bills.xlsx` and `Completed Bills.xlsx` and confirm row counts match the database.
