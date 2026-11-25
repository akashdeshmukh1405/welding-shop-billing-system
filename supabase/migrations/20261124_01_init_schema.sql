-- ==============================================================================
-- 1. EXTENSIONS & ENUMS
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Payment Status Enum
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Payment Method Enum
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User Role Enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'CASHIER', 'OPERATOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. CORE DATABASE TABLES
-- ==============================================================================

-- 1. Shop Settings Table
CREATE TABLE IF NOT EXISTS shop_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_name TEXT NOT NULL DEFAULT 'JAI MATA DI',
    header_tradition TEXT DEFAULT '|| Shree ||',
    business_category TEXT DEFAULT 'STEEL FURNITURE & RAILING',
    owner_name TEXT DEFAULT 'Mr. Vaibhav Wagh',
    shop_phone TEXT NOT NULL DEFAULT '9561482326',
    alt_phone TEXT DEFAULT '9561482326',
    shop_address TEXT NOT NULL DEFAULT 'Naggaon Road, Bodwad, Dist. Jalgaon',
    email TEXT DEFAULT 'jaymatadisteel.bodwad@gmail.com',
    gst_number TEXT DEFAULT '',
    upi_id TEXT DEFAULT '9561482326@ybl',
    upi_qr_url TEXT,
    logo_url TEXT,
    invoice_prefix TEXT NOT NULL DEFAULT 'INV-',
    next_invoice_number INTEGER NOT NULL DEFAULT 1001,
    terms_and_conditions TEXT DEFAULT '1. 50% advance required on order confirmation.\n2. Balance payment on delivery / installation.\n3. Goods once fabricated as per agreed dimensions cannot be returned.',
    invoice_footer_message TEXT DEFAULT 'Thank you! Visit again.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email TEXT,
    address TEXT,
    gst_number VARCHAR(30),
    total_bills INTEGER NOT NULL DEFAULT 0,
    total_billed NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_billed >= 0),
    total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_paid >= 0),
    total_pending NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_pending >= 0),
    last_bill_date TIMESTAMPTZ,
    last_bill_number VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Products / Work Catalog Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'FABRICATION',
    unit VARCHAR(20) NOT NULL DEFAULT 'sq ft',
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    hsn_code VARCHAR(20),
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name TEXT NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT,
    customer_gst VARCHAR(30),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ,
    primary_payment_method payment_method NOT NULL DEFAULT 'CASH',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    grand_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (grand_total >= 0),
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    pending_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (pending_amount >= 0),
    status payment_status NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_invoice_balance CHECK (paid_amount + pending_amount = grand_total)
);

-- 5. Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
    unit VARCHAR(20) NOT NULL DEFAULT 'nos',
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0),
    tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total >= 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Payments Table (Immutable financial ledger entries)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method payment_method NOT NULL DEFAULT 'CASH',
    reference_note TEXT,
    transaction_id VARCHAR(100),
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time VARCHAR(20),
    received_by_user_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Payment History / Audit Log Table
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL, -- 'RECORD_ADVANCE', 'COLLECT_PAYMENT', 'ADJUSTMENT'
    amount NUMERIC(12, 2) NOT NULL,
    previous_paid NUMERIC(12, 2) NOT NULL,
    new_paid NUMERIC(12, 2) NOT NULL,
    previous_pending NUMERIC(12, 2) NOT NULL,
    new_pending NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    actor_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Backup Logs Table (Tracks automated & manual Excel/SQL backups)
CREATE TABLE IF NOT EXISTS backup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type VARCHAR(50) NOT NULL, -- 'EXCEL_EXPORT', 'SQL_DUMP', 'MANUAL_RESTORE'
    filename TEXT NOT NULL,
    filesize_bytes BIGINT,
    records_count JSONB,
    status VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_pending_amount ON invoices(pending_amount) WHERE pending_amount > 0;
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date DESC);
CREATE INDEX IF NOT EXISTS idx_payment_history_invoice_id ON payment_history(invoice_id);

-- ==============================================================================
-- 4. AUTO-UPDATE TIMESTAMP TRIGGER FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shop_settings_updated_at BEFORE UPDATE ON shop_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
