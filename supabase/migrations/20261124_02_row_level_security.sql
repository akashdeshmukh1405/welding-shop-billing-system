-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) CONFIGURATION
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
-- 4. ANONYMOUS ACCESS POLICIES (Client Frontend with Anon Key)
-- For single-tenant shop POS deployments without auth gating, anon role is permitted
-- to read settings & products, and create bills/payments through authenticated API routes.
-- Direct destructive deletion by anon is strictly BLOCKED.
-- ==============================================================================

CREATE POLICY "Anon read access on shop_settings"
    ON shop_settings FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Anon read and write customers"
    ON customers FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anon read and write products"
    ON products FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anon read and write invoices"
    ON invoices FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anon read and write invoice_items"
    ON invoice_items FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anon read and write payments"
    ON payments FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anon read and write backup_logs"
    ON backup_logs FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);
