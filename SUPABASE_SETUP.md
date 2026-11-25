# Customer Supabase (PostgreSQL) Database Setup Guide

This guide explains how the business customer can set up their own dedicated **Supabase PostgreSQL** database. The customer holds 100% ownership, credentials, and control over their data.

---

## Prerequisites
- A web browser (on laptop, desktop, or tablet).
- An email address for your business.

---

## Step 1: Create a Free Supabase Account & Project

1. Visit [https://supabase.com](https://supabase.com) and click **Start your project** / **Sign Up**.
2. Click **New Project** in your dashboard.
3. Fill in the project details:
   - **Organization**: Choose or create your business organization.
   - **Name**: `jay-mata-di-billing` (or your preferred name).
   - **Database Password**: Choose a strong password and save it in a safe place.
   - **Region**: Choose **South Asia (Mumbai) - ap-south-1** for the lowest latency in Maharashtra/India.
4. Click **Create new project** and wait 1–2 minutes for the database to provision.

---

## Step 2: Run Database Schema & Migration Scripts

1. In your Supabase project dashboard, click **SQL Editor** in the left sidebar.
2. Click **New Query**.
3. Open and copy the contents of the following files in order from the `supabase/migrations/` folder in this repository:

### Migration 1: Schema & Tables (`supabase/migrations/20261124_01_init_schema.sql`)
- Creates all 8 core tables:
  - `shop_settings`
  - `customers`
  - `products`
  - `invoices`
  - `invoice_items`
  - `payments`
  - `payment_history`
  - `backup_logs`
- Creates financial check constraints, indexes, and automatic timestamp triggers.
- Paste the script into the SQL Editor and click **Run**. Verify `Success. No rows returned`.

### Migration 2: Row Level Security (`supabase/migrations/20261124_02_row_level_security.sql`)
- Enables PostgreSQL Row Level Security (RLS) on all 8 tables.
- Protects client records so only authorized API tokens and staff sessions can read and write data.
- Paste the script into the SQL Editor and click **Run**.

### Migration 3: Storage Bucket (`supabase/migrations/20261124_03_storage_bucket.sql`)
- Creates the `invoices` storage bucket to host generated PDF invoices for customer downloads and WhatsApp attachments.
- Paste the script into the SQL Editor and click **Run**.

---

## Step 3: Retrieve Your Project API Keys

1. In your Supabase project dashboard, navigate to:
   **Project Settings** (gear icon at bottom left) -> **API**.
2. Note the following three values:
   - **Project URL**: Format `https://[your-project-ref].supabase.co`
   - **Project API Keys -> `anon` / `public`**: A long token starting with `eyJhbGci...`
   - **Project API Keys -> `service_role` / `secret`**: A long token starting with `eyJhbGci...` (keep this private; never share in public repositories).

---

## Step 4: Configure Your Server Environment (`.env.local`)

On your deployment server or local computer:

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Enter your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-secret-key"
   ```
3. Restart the application:
   ```bash
   npm run build
   npm run start
   ```

---

## Step 5: Verify Live Connection

1. Open the application and navigate to **Settings** -> **Database & Cloud Ownership**.
2. Click **Test Connection**.
3. You will see:
   - 🟢 **Customer Supabase PostgreSQL Connected**
   - Live count of invoices, customers, and shop settings in your cloud database.
4. Click **Sync Local Records to Cloud** to copy any existing billing history into your new database with zero loss.
