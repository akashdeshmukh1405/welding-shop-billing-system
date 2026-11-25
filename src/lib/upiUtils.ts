import QRCode from "qrcode";

export interface UpiParams {
  upiId: string;
  payeeName?: string;
  amount?: number;
  invoiceNumber?: string;
  note?: string;
}

/**
 * Builds standard NPCI UPI payment intent URI
 */
export function buildUpiUri(params: UpiParams): string {
  const { upiId, payeeName = "Jay Mata Di", amount, invoiceNumber, note } = params;
  
  if (!upiId) return "";

  const cleanUpi = upiId.trim();
  const txNote = note || (invoiceNumber ? `Invoice ${invoiceNumber}` : "Bill Payment");

  let uri = `upi://pay?pa=${cleanUpi}&pn=${encodeURIComponent(payeeName)}&cu=INR&tn=${encodeURIComponent(txNote)}`;

  if (amount && amount > 0) {
    uri += `&am=${amount.toFixed(2)}`;
  }

  return uri;
}

/**
 * Generates high-contrast, scan-optimized QR code base64 Data URL (synchronous cache or async)
 */
export async function generateUpiQrDataUrl(params: UpiParams): Promise<string> {
  const uri = buildUpiUri(params);
  if (!uri) return "";

  try {
    return await QRCode.toDataURL(uri, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 256,
      color: {
        dark: "#0f172a", // slate-950
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("Failed to generate UPI QR code:", err);
    return "";
  }
}
