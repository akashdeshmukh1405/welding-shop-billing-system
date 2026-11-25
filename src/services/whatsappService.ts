import { Invoice, ShopSettings } from "../types";
import { formatCurrency, sanitizePhone } from "../lib/utils";
import { storageService } from "./storageService";
import { pdfService } from "./pdfService";

export interface PersonalWhatsAppShareResult {
  sharedViaNativeSheet: boolean;
  filename: string;
  chatUrl: string;
  downloaded: boolean;
}

class WhatsAppService {
  /**
   * Generates WhatsApp direct chat URL for the recipient
   */
  public getWhatsAppShareUrl(phone: string, message?: string): string {
    const cleanNumber = sanitizePhone(phone);
    const fullNumber = cleanNumber.startsWith("91") ? cleanNumber : `91${cleanNumber}`;
    if (!message) {
      return `https://wa.me/${fullNumber}`;
    }
    return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
  }

  /**
   * Generates a short, professional document caption
   */
  public formatInvoiceCaption(invoice: Invoice, settings?: ShopSettings): string {
    const shop = settings || storageService.getSettings();
    return `Tax Invoice #${invoice.invoiceNumber} from ${shop.shopName} (${formatCurrency(invoice.grandTotal)}). Please find PDF attached.`;
  }

  /**
   * Shares the actual generated PDF document using Personal WhatsApp.
   * 1. On mobile / supported devices: Uses Web Share API to directly attach the PDF file into WhatsApp.
   * 2. On desktop / unsupported browsers: Automatically generates and downloads the proper PDF to the device,
   *    and immediately opens personal WhatsApp chat with the customer so they can attach the PDF via 📎.
   */
  public async shareInvoicePDFViaPersonalWhatsApp(
    invoice: Invoice,
    settings?: ShopSettings
  ): Promise<PersonalWhatsAppShareResult> {
    const shop = settings || storageService.getSettings();
    const filename = pdfService.getInvoiceFilename(invoice);
    const chatUrl = this.getWhatsAppShareUrl(invoice.customerPhone);

    // 1. Check if device supports Web Share API with actual file attachments (Mobile / Safari / Edge)
    if (typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.share && navigator.canShare) {
      try {
        const blob = pdfService.getInvoicePDFBlob(invoice, shop);
        const file = new File([blob], filename, { type: "application/pdf" });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Invoice ${invoice.invoiceNumber}`,
            text: `Invoice #${invoice.invoiceNumber} for ${invoice.customerName} - ${shop.shopName}`,
          });
          return {
            sharedViaNativeSheet: true,
            filename,
            chatUrl,
            downloaded: false,
          };
        }
      } catch (err: any) {
        if (err?.name === "AbortError") {
          // User cancelled the share dialog
          return {
            sharedViaNativeSheet: true,
            filename,
            chatUrl,
            downloaded: false,
          };
        }
        console.warn("Native file share failed, falling back to download + chat open:", err);
      }
    }

    // 2. Desktop / standard fallback:
    // Generate and download the proper PDF document immediately to device
    try {
      pdfService.downloadInvoicePDF(invoice, shop);
    } catch (e) {
      console.error("Failed to trigger PDF download:", e);
    }

    // Open Personal WhatsApp chat with the customer
    if (typeof window !== "undefined") {
      window.open(chatUrl, "_blank");
    }

    return {
      sharedViaNativeSheet: false,
      filename,
      chatUrl,
      downloaded: true,
    };
  }
}

export const whatsappService = new WhatsAppService();
