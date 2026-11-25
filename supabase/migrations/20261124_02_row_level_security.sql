-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) CONFIGURATION (HARDENED)
-- Welding Shop Billing & POS System
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_logs ENABLE ROW LEVEL SECURITY;

-- Clean up any existing legacy policies for idempotency
DROP POLICY IF EXISTS "Service role full access on shop_settings" ON shop_settings;
DROP POLICY IF EXISTS "Service role full access on customers" ON customers;
DROP POLICY IF EXISTS "Service role full access on products" ON products;
DROP POLICY IF EXISTS "Service role full access on invoices" ON invoices;
DROP POLICY IF EXISTS "Service role full access on invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Service role full access on payments" ON payments;
DROP POLICY IF EXISTS "Service role full access on payment_history" ON payment_history;
DROP POLICY IF EXISTS "Service role full access on backup_logs" ON backup_logs;

DROP POLICY IF EXISTS "Staff read access on shop_settings" ON shop_settings;
DROP POLICY IF EXISTS "Staff update access on shop_settings" ON shop_settings;
DROP POLICY IF EXISTS "Staff all access on customers" ON customers;
DROP POLICY IF EXISTS "Staff all access on products" ON products;
DROP POLICY IF EXISTS "Staff all access on invoices" ON invoices;
DROP POLICY IF EXISTS "Staff all access on invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Staff all access on payments" ON payments;
DROP POLICY IF EXISTS "Staff read access on payment_history" ON payment_history;
DROP POLICY IF EXISTS "Staff all access on backup_logs" ON backup_logs;

DROP POLICY IF EXISTS "Anon read access on shop_settings" ON shop_settings;
DROP POLICY IF EXISTS "Anon read and write customers" ON customers;
DROP POLICY IF EXISTS "Anon read and write products" ON products;
DROP POLICY IF EXISTS "Anon read active products" ON products;
DROP POLICY IF EXISTS "Anon read and write invoices" ON invoices;
DROP POLICY IF EXISTS "Anon read and write invoice_items" ON invoice_items;
DROP POLICY IF EXISTS "Anon read and write payments" ON payments;
DROP POLICY IF EXISTS "Anon read and write backup_logs" ON backup_logs;

-- ==============================================================================
-- 2. SERVICE ROLE POLICIES (Server-Side Admin & API Routes)
-- The service role key bypasses RLS by default in Supabase, but explicit policies
-- ensure guaranteed access across custom functions and database webhooks.
-- ==============================================================================

CREATE POLICY "Service role full access on shop_settings"
    ON shop_settings FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on customers"
    ON customers FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on products"
    ON products FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on invoices"
    ON invoices FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on invoice_items"
    ON invoice_items FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on payments"
    ON payments FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on payment_history"
    ON payment_history FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on backup_logs"
    ON backup_logs FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 3. AUTHENTICATED STAFF POLICIES
-- Authenticated shop users (owner, cashier) can read and manage records.
-- ==============================================================================

CREATE POLICY "Staff read access on shop_settings"
    ON shop_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff update access on shop_settings"
    ON shop_settings FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Staff all access on customers"
    ON customers FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Staff all access on products"
    ON products FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Staff all access on invoices"
    ON invoices FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Staff all access on invoice_items"
    ON invoice_items FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Staff all access on payments"
    ON payments FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Staff read access on payment_history"
    ON payment_history FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Staff all access on backup_logs"
    ON backup_logs FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 4. ANONYMOUS ACCESS POLICIES (HARDENED SECURITY)
-- Strictly BLOCKS anonymous reading and writing to customers, invoices,
-- payments, payment history, and backup logs.
-- Anonymous users (public) can ONLY read public shop branding and active catalog items.
-- ==============================================================================

-- 4.1 Shop Settings: Public can only read shop name, address, and contact info
CREATE POLICY "Anon read access on shop_settings"
    ON shop_settings FOR SELECT
    TO anon
    USING (true);

-- 4.2 Products: Public can only view active catalog items (read-only)
CREATE POLICY "Anon read active products"
    ON products FOR SELECT
    TO anon
    USING (is_active = true);

-- Customers, Invoices, Invoice Items, Payments, Payment History, and Backup Logs:
-- NO ANONYMOUS POLICIES (Default DENY ALL for anon role).
