-- ==============================================================================
-- SUPABASE STORAGE CONFIGURATION (HARDENED - PRIVATE BUCKET)
-- Bucket: invoices (Stores generated PDF invoices for customer delivery)
-- ==============================================================================

-- 1. Create or update 'invoices' bucket as strictly PRIVATE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'invoices',
    'invoices',
    false, -- STRICTLY PRIVATE: prevents unauthorized public scraping of customer bills
    10485760, -- 10MB max per PDF
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf'];

-- 2. Clean up legacy storage policies for idempotency
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public Read Access on Invoices Bucket" ON storage.objects;
    DROP POLICY IF EXISTS "Staff & Server Upload to Invoices Bucket" ON storage.objects;
    DROP POLICY IF EXISTS "Service Role Delete Invoices" ON storage.objects;
    DROP POLICY IF EXISTS "Service Role Full Access on Invoices Bucket" ON storage.objects;
    DROP POLICY IF EXISTS "Staff Read Invoices Bucket" ON storage.objects;
    DROP POLICY IF EXISTS "Staff Upload Invoices Bucket" ON storage.objects;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 3. Service Role Policies (Full management for authorized server-side API routes)
DO $$ BEGIN
    CREATE POLICY "Service Role Full Access on Invoices Bucket"
        ON storage.objects FOR ALL
        TO service_role
        USING (bucket_id = 'invoices')
        WITH CHECK (bucket_id = 'invoices');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Authenticated Staff Policies (Logged-in shop personnel)
DO $$ BEGIN
    CREATE POLICY "Staff Read Invoices Bucket"
        ON storage.objects FOR SELECT
        TO authenticated
        USING (bucket_id = 'invoices');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Staff Upload Invoices Bucket"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'invoices');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 5. Anonymous / Public Access:
-- ZERO access policies for public/anon on storage.objects.
-- Customer PDF downloads operate strictly via time-limited cryptographic Signed URLs.
