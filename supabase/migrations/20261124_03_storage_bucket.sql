-- ==============================================================================
-- SUPABASE STORAGE CONFIGURATION
-- Bucket: invoices (Stores generated PDF invoices for customer download & WhatsApp delivery)
-- ==============================================================================

-- 1. Create 'invoices' bucket if not already present
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'invoices',
    'invoices',
    true,
    10485760, -- 10MB max per PDF
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['application/pdf'];

-- 2. Storage Policies

-- Anyone can read invoice PDFs via public URL
DO $$ BEGIN
    CREATE POLICY "Public Read Access on Invoices Bucket"
        ON storage.objects FOR SELECT
        TO public
        USING (bucket_id = 'invoices');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Authenticated and Service Role can upload invoices
DO $$ BEGIN
    CREATE POLICY "Staff & Server Upload to Invoices Bucket"
        ON storage.objects FOR INSERT
        TO public
        WITH CHECK (bucket_id = 'invoices');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update / Delete restricted to service role
DO $$ BEGIN
    CREATE POLICY "Service Role Delete Invoices"
        ON storage.objects FOR DELETE
        TO service_role
        USING (bucket_id = 'invoices');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
