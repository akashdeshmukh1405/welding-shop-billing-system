import { getServerSupabaseClient, isServerSupabaseConfigured } from "./server";

const INVOICE_BUCKET = "invoices";
// Default signed URL validity: 7 days (in seconds)
const DEFAULT_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

export interface StorageUploadResult {
  success: boolean;
  filePath?: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Uploads an invoice PDF to the private Supabase storage bucket using the server-side service role client.
 */
export async function uploadInvoicePDFToStorage(
  invoiceNumber: string,
  pdfBuffer: Buffer
): Promise<StorageUploadResult> {
  if (!isServerSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase server client not configured in environment.",
    };
  }

  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      error: "Failed to initialize Supabase server client.",
    };
  }

  try {
    const cleanInvNo = invoiceNumber.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
    const filePath = `${cleanInvNo}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from(INVOICE_BUCKET)
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return {
        success: false,
        error: uploadError.message,
      };
    }

    return {
      success: true,
      filePath,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Storage upload failed.",
    };
  }
}

/**
 * Generates a time-limited cryptographically signed download URL for an invoice PDF.
 * Expiration defaults to 7 days (604,800 seconds).
 */
export async function generateInvoiceSignedUrl(
  filePath: string,
  expiresInSeconds: number = DEFAULT_URL_EXPIRY_SECONDS
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  if (!isServerSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase server client not configured.",
    };
  }

  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      error: "Failed to initialize Supabase server client.",
    };
  }

  try {
    const { data, error } = await supabase.storage
      .from(INVOICE_BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return {
        success: false,
        error: error?.message || "Could not generate signed URL.",
      };
    }

    return {
      success: true,
      signedUrl: data.signedUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to generate signed URL.",
    };
  }
}

/**
 * High-level helper: Uploads invoice PDF to private storage and returns a 7-day signed URL.
 * Returns null if Supabase is not configured (allowing seamless offline fallback).
 */
export async function getOrGenerateInvoiceSignedUrl(
  invoiceNumber: string,
  pdfBuffer: Buffer,
  expiresInSeconds: number = DEFAULT_URL_EXPIRY_SECONDS
): Promise<string | null> {
  if (!isServerSupabaseConfigured()) {
    return null;
  }

  const uploadResult = await uploadInvoicePDFToStorage(invoiceNumber, pdfBuffer);
  if (!uploadResult.success || !uploadResult.filePath) {
    console.warn("Storage upload skipped or failed:", uploadResult.error);
    return null;
  }

  const signedResult = await generateInvoiceSignedUrl(uploadResult.filePath, expiresInSeconds);
  if (!signedResult.success || !signedResult.signedUrl) {
    console.warn("Signed URL generation failed:", signedResult.error);
    return null;
  }

  return signedResult.signedUrl;
}
