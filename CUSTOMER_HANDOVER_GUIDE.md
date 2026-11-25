# Customer Handover Guide
## जय माता दी — स्टील फर्निचर अँड रेलींग (Welding Shop Billing & POS System)

This document is prepared for **वैभव वाय** (Shop Owner) for daily billing operations, customer management, payments, and independent data ownership.

---

## 1. Shop Identity & Preconfigured Details
The application is preconfigured with your shop identity:
- **Shop Name**: जय माता दी
- **Category**: स्टील फर्निचर अँड रेलींग
- **Proprietor**: प्रोप्रा. वैभव वाय
- **Mobile Number**: 9561482326
- **Address**: नागगांव रोड, बोडवड जि. जळगाव
- **UPI ID for QR Payments**: `9561482326@ybl`
- **Header Tradition**: ॥ श्री ॥

---

## 2. Daily Billing Workflow

### Step 1: Create a New Bill
1. Click **New Bill** on the dashboard or top navigation.
2. Select an existing customer or enter:
   - **Customer Name**: e.g., `Rahul Patil`
   - **Mobile Number**: `9876543210`
3. Add Products/Work items:
   - Select item (e.g. `MS Gate`, `SS Railing`, `Safety Door`)
   - Enter Quantity and Unit Rate
   - Line totals and Grand Total calculate automatically.
4. Click **Generate Bill**.

### Step 2: Payment Decision
When generating the bill, choose:
- **PAY NOW**:
  - Customer pays the full amount now.
  - Bill is automatically marked **PAID** with Balance Due = ₹0.
  - Bill moves directly to Completed Bills.
- **KEEP PENDING**:
  - Customer wants to pay later.
  - You can enter an **Advance Payment** (e.g., ₹2,000 on a ₹10,000 bill).
  - Status becomes **PARTIAL** or **PENDING**.
  - Bill appears immediately under **Pending Payments**.

### Step 3: Collecting Remaining Balances
1. Open **Pending Payments** (`/pending`).
2. Click **Collect Payment** on the customer's bill.
3. Enter amount received (Cash, UPI, Bank Transfer).
4. As soon as the balance reaches ₹0, the bill automatically switches to **PAID** and removes itself from the pending list.

---

## 3. Invoice Printing & Device Sharing

1. From any bill, click **Print / Share**.
2. **Formats Available**:
   - **A4 Tax Invoice**: Traditional header ॥ श्री ॥, shop branding, GSTIN, customer details, itemized table, and dynamic UPI QR code.
   - **80mm Thermal Receipt**: Fast monospace receipt for compact bluetooth or USB thermal receipt printers.
3. **Download PDF**:
   - Saves clean file directly to your phone/tablet/computer:
     e.g., `INV-1006_Rahul_Patil.pdf`.
4. **Share PDF (Tablet/iPad)**:
   - Tap **Share** to use your device's native sharing menu (AirDrop, WhatsApp, Save to Files, Email).

---

## 4. WhatsApp PDF Delivery

### Automated Cloud Mode (Meta WhatsApp Cloud API)
- If configured in `.env.local` (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`), clicking **Send PDF on WhatsApp** directly delivers the actual `INV-1006.pdf` document attachment to the customer's WhatsApp.

### Manual 1-Tap Sharing Workflow (No API required)
- If Cloud API is not configured:
  1. The system automatically downloads the invoice PDF to your device.
  2. Opens WhatsApp with a pre-filled professional billing message with customer name, invoice number, and amounts.
  3. You simply tap the paperclip icon in WhatsApp and attach the downloaded PDF.

---

## 5. Independent Excel Business Reports

You do not need developer permission or database knowledge to review your shop's financials. Go to **Settings** -> **Excel Backup & Reports** to download:

1. **Pending Bills.xlsx**: All unpaid bills, customer phone numbers, and balances due.
2. **Completed Bills.xlsx**: All fully paid bills with settlement modes.
3. **Advance Payments.xlsx**: Complete list of advance deposits received.
4. **All Transactions.xlsx**: Full payment ledger sorted newest first.
5. **Complete Excel Backup (.xlsx)**: Full multi-sheet workbook containing your entire database.

---

## 6. Offline & Tablet Usability

- Fully responsive on **iPad**, **Android Tablets**, **Laptops**, and **Desktops**.
- Works even during intermittent internet connectivity with local IndexedDB storage.
- When internet reconnects, queued transactions synchronize with automatic duplicate prevention.

---

## 7. Customer Data Ownership Guarantee

- The database belongs exclusively to you under your Supabase account.
- The developer has no access to your customer contact list, invoices, or revenue numbers.
- You can export your data at any time in Excel or SQL format.
