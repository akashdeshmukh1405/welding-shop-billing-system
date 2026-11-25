import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { Invoice, ShopSettings } from "@/types";
import { formatAmount, formatDate } from "@/lib/utils";
import { storageService } from "./storageService";
import { buildUpiUri } from "@/lib/upiUtils";

export class PDFService {
  /**
   * Draws a razor-sharp vector QR code directly into jsPDF
   */
  private drawVectorQrCode(doc: jsPDF, text: string, x: number, y: number, size: number): boolean {
    try {
      const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
      const moduleCount = qr.modules.size;
      const moduleSize = size / moduleCount;

      // Clean White Background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(x - 1.5, y - 1.5, size + 3, size + 3, 1, 1, "FD");

      // QR Modules
      doc.setFillColor(15, 23, 42); // slate-950

      for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
          if (qr.modules.get(row, col)) {
            doc.rect(x + col * moduleSize, y + row * moduleSize, moduleSize, moduleSize, "F");
          }
        }
      }
      return true;
    } catch (e) {
      console.warn("Could not draw vector QR code:", e);
      return false;
    }
  }

  /**
   * Translates or maps Marathi shop details to professional English equivalents
   */
  private getEnglishShopDetails(settings: ShopSettings) {
    const isDevanagari = (str: string) => /[\u0900-\u097F]/.test(str);

    const shopName = isDevanagari(settings.shopName || "")
      ? "JAI MATA DI"
      : settings.shopName || "JAI MATA DI";

    const businessCategory = isDevanagari(settings.businessCategory || "")
      ? "STEEL FURNITURE & RAILING"
      : settings.businessCategory || "STEEL FURNITURE & RAILING";

    const cleanOwner = (settings.ownerName || "Vaibhav Wagh")
      .replace(/Proprietor:?\s*/gi, "")
      .replace(/Prop\.?\s*/gi, "")
      .trim();

    const ownerName = isDevanagari(settings.ownerName || "")
      ? "Mr. Vaibhav Wagh"
      : `Mr. ${cleanOwner.startsWith("Mr.") ? cleanOwner.replace(/^Mr\.\s*/i, "") : cleanOwner}`;

    const shopAddress = isDevanagari(settings.shopAddress || "")
      ? "Naggaon Road, Bodwad, Dist. Jalgaon"
      : settings.shopAddress || "Naggaon Road, Bodwad, Dist. Jalgaon";

    return {
      headerTradition: "|| SHREE ||",
      shopName,
      businessCategory,
      ownerName,
      shopAddress,
      shopPhone: settings.shopPhone || "9561482326",
      altPhone: settings.altPhone,
      email: settings.email,
      gstNumber: settings.gstNumber,
      upiId: settings.upiId || "9561482326@ybl",
    };
  }

  public generateInvoicePDF(invoice: Invoice, customSettings?: ShopSettings): jsPDF {
    const rawSettings = customSettings || storageService.getSettings();
    const shop = this.getEnglishShopDetails(rawSettings);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 12;

    // --- 1. ENGLISH SHOP HEADER ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text(shop.headerTradition, pageWidth / 2, currentY, { align: "center" });
    currentY += 6.5;

    // Main Business Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-950
    doc.text(shop.shopName, pageWidth / 2, currentY, { align: "center" });
    currentY += 6;

    // Business Category Subtitle
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(154, 52, 18); // orange-800
    doc.text(shop.businessCategory, pageWidth / 2, currentY, { align: "center" });
    currentY += 5.5;

    // Proprietor & Phone
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    let contactLine = `${shop.ownerName}  |  Mobile: +91 ${shop.shopPhone}`;
    if (shop.altPhone) contactLine += `  |  Alt: +91 ${shop.altPhone}`;
    doc.text(contactLine, pageWidth / 2, currentY, { align: "center" });
    currentY += 5;

    // Address & GSTIN
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    let addressLine = shop.shopAddress;
    if (shop.gstNumber) addressLine += `  |  GSTIN: ${shop.gstNumber}`;
    doc.text(addressLine, pageWidth / 2, currentY, { align: "center" });
    currentY += 5.5;

    // Divider Line
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(12, currentY, pageWidth - 12, currentY);
    currentY += 6;

    // --- 2. TAX INVOICE BADGE & METADATA GRID ---
    // Centered TAX INVOICE Banner
    const bannerWidth = 44;
    const bannerX = (pageWidth - bannerWidth) / 2;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(bannerX, currentY, bannerWidth, 7, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text("TAX INVOICE", pageWidth / 2, currentY + 4.9, { align: "center" });

    currentY += 12;

    // Metadata Row 1: Invoice Date & Invoice Number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Invoice Date:", 14, currentY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    doc.text(formatDate(invoice.date), 38, currentY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);
    doc.text("Invoice Number:", pageWidth - 65, currentY);
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text(invoice.invoiceNumber, pageWidth - 14, currentY, { align: "right" });

    currentY += 6;

    // Metadata Row 2: Due Date & Payment Status Badge
    if (invoice.dueDate) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Due Date:", 14, currentY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(formatDate(invoice.dueDate), 38, currentY);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Payment Status:", pageWidth - 65, currentY);

    const statusText =
      invoice.status === "PAID"
        ? "PAID"
        : invoice.status === "PARTIAL"
        ? "PARTIALLY PAID"
        : "PENDING";

    const statusColor: [number, number, number] =
      invoice.status === "PAID"
        ? [16, 185, 129] // emerald
        : invoice.status === "PARTIAL"
        ? [245, 158, 11] // amber
        : [225, 29, 72]; // rose

    const badgeWidth = invoice.status === "PARTIAL" ? 28 : 20;
    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.roundedRect(pageWidth - 14 - badgeWidth, currentY - 4.2, badgeWidth, 5.5, 1.2, 1.2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text(statusText, pageWidth - 14 - badgeWidth / 2, currentY - 0.4, { align: "center" });

    currentY += 7.5;

    // --- 3. CUSTOMER DETAILS BOX ---
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(12, currentY, pageWidth - 24, 20, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("BILL TO / CUSTOMER DETAILS", 16, currentY + 4.5);

    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Customer Name: ${invoice.customerName}`, 16, currentY + 10);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    let custContact = `Mobile Number: +91 ${invoice.customerPhone}`;
    if (invoice.customerAddress) custContact += `  |  Address: ${invoice.customerAddress}`;
    doc.text(custContact, 16, currentY + 15.5);

    if (invoice.customerGst) {
      doc.setFont("helvetica", "bold");
      doc.text(`GSTIN: ${invoice.customerGst}`, pageWidth - 16, currentY + 10, { align: "right" });
    }

    currentY += 24;

    // --- 4. ITEMIZED TABLE (100% ENGLISH LABELS) ---
    const tableHeaders = [["#", "Description", "Quantity", "Rate (Rs.)", "Amount (Rs.)"]];
    const tableData = invoice.items.map((it, idx) => [
      String(idx + 1),
      it.description ? `${it.name}\n${it.description}` : it.name,
      `${it.quantity} ${it.unit}`,
      formatAmount(it.unitPrice),
      formatAmount(it.total),
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableData,
      startY: currentY,
      margin: { left: 12, right: 12 },
      theme: "grid",
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: "bold",
        halign: "left",
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: [15, 23, 42],
        lineColor: [226, 232, 240],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 26, halign: "right" },
        3: { cellWidth: 28, halign: "right" },
        4: { cellWidth: 32, halign: "right", fontStyle: "bold" },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 6;

    // --- 5. FINANCIAL BREAKDOWN BOX (Right) ---
    const totalsX = pageWidth - 82;
    const totalsWidth = 70;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(totalsX, finalY, totalsWidth, invoice.discountAmount > 0 ? 36 : 30, 2, 2, "FD");

    let totalRowY = finalY + 5.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Subtotal:", totalsX + 4, totalRowY);
    doc.text(`Rs. ${formatAmount(invoice.subtotal)}`, totalsX + totalsWidth - 4, totalRowY, { align: "right" });
    totalRowY += 5.5;

    if (invoice.discountAmount > 0) {
      doc.setTextColor(16, 185, 129);
      doc.text("Discount:", totalsX + 4, totalRowY);
      doc.text(`-Rs. ${formatAmount(invoice.discountAmount)}`, totalsX + totalsWidth - 4, totalRowY, { align: "right" });
      totalRowY += 5.5;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Grand Total:", totalsX + 4, totalRowY);
    doc.text(`Rs. ${formatAmount(invoice.grandTotal)}`, totalsX + totalsWidth - 4, totalRowY, { align: "right" });
    totalRowY += 5.5;

    doc.setFontSize(8.5);
    doc.setTextColor(16, 185, 129);
    doc.text("Advance Payment:", totalsX + 4, totalRowY);
    doc.text(`Rs. ${formatAmount(invoice.paidAmount)}`, totalsX + totalsWidth - 4, totalRowY, { align: "right" });
    totalRowY += 5.5;

    doc.setFont("helvetica", "bold");
    doc.setTextColor(
      invoice.pendingAmount > 0 ? 225 : 16,
      invoice.pendingAmount > 0 ? 29 : 185,
      invoice.pendingAmount > 0 ? 72 : 129
    );
    doc.text("Pending Balance:", totalsX + 4, totalRowY);
    doc.text(`Rs. ${formatAmount(invoice.pendingAmount)}`, totalsX + totalsWidth - 4, totalRowY, { align: "right" });

    // --- 6. UPI QR PAYMENT SECTION (Appears on every invoice: paid, partial, unpaid) ---
    const upiId = (shop.upiId || "9561482326@ybl").trim();
    const payeeName = shop.shopName || "JAI MATA DI";
    const upiCardX = 14;
    const upiCardWidth = totalsX - 22;
    const isSettled = invoice.pendingAmount <= 0 || invoice.status === "PAID";
    const isUnpaid = invoice.paidAmount === 0 || invoice.pendingAmount === invoice.grandTotal;

    if (upiId) {
      const qrSize = 25;

      if (isSettled) {
        // Rule 3: For fully paid invoices, display shop's static UPI QR without a payment amount
        const upiUri = buildUpiUri({
          upiId,
          payeeName,
          invoiceNumber: invoice.invoiceNumber,
          note: `Shop UPI - ${payeeName}`,
        });

        // Draw Card Frame with subtle green highlight
        doc.setFillColor(240, 253, 244); // emerald-50
        doc.setDrawColor(34, 197, 94); // emerald-500
        doc.setLineWidth(0.5);
        doc.roundedRect(upiCardX, finalY, upiCardWidth, 42, 2, 2, "FD");

        // Draw Vector QR Code inside
        this.drawVectorQrCode(doc, upiUri, upiCardX + 4, finalY + 4, qrSize);

        // Text beside QR code
        const textX = upiCardX + qrSize + 7;
        let textY = finalY + 7;

        // Rule 4: Display a prominent PAID – NO PAYMENT DUE label on fully paid invoices
        doc.setFillColor(16, 185, 129); // emerald-600
        doc.roundedRect(textX, textY - 3, 56, 6, 1.2, 1.2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text("PAID – NO PAYMENT DUE", textX + 28, textY + 1.2, { align: "center" });
        textY += 9;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(4, 120, 87); // emerald-700
        doc.text("Shop Static UPI QR Code", textX, textY);
        textY += 4.5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`UPI ID: ${upiId}`, textX, textY);
        textY += 4.5;

        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Payment received in full (${invoice.primaryPaymentMethod || "CASH"}). Thank you!`, textX, textY);
        textY += 4;
        doc.text("Accepted: PhonePe | Google Pay | Paytm | BHIM", textX, textY);

        // Terms & Conditions below QR card
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text("TERMS & CONDITIONS", 14, finalY + 48);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.text("1. All items inspected and accepted in good working condition.", 14, finalY + 52);
        doc.text("2. Workmanship guaranteed as per standard fabrication warranty.", 14, finalY + 55.5);
        doc.text("3. This invoice is fully settled with zero outstanding balance.", 14, finalY + 59);
      } else {
        // Unpaid or Partial Invoices
        const amountToPay = invoice.pendingAmount;
        const upiUri = buildUpiUri({
          upiId,
          payeeName,
          amount: amountToPay,
          invoiceNumber: invoice.invoiceNumber,
          note: `Bill ${invoice.invoiceNumber} Balance Due - ${payeeName}`,
        });

        // Draw Card Frame
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.4);
        doc.roundedRect(upiCardX, finalY, upiCardWidth, 42, 2, 2, "FD");

        // Draw Vector QR Code inside
        this.drawVectorQrCode(doc, upiUri, upiCardX + 4, finalY + 4, qrSize);

        // Text beside QR code
        const textX = upiCardX + qrSize + 7;
        let textY = finalY + 7;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(isUnpaid ? "SCAN TO PAY FULL BALANCE" : "SCAN TO PAY REMAINING BALANCE", textX, textY);
        textY += 5;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(185, 28, 28); // rose-700
        doc.text(`Scan to Pay Rs. ${formatAmount(amountToPay)}`, textX, textY);
        textY += 5;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`UPI ID: ${upiId}`, textX, textY);
        textY += 4.5;

        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Accepted: PhonePe | Google Pay | Paytm | BHIM", textX, textY);

        // Terms & Conditions below QR card
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text("TERMS & CONDITIONS", 14, finalY + 48);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.text("1. 50% advance payment required upon order booking.", 14, finalY + 52);
        doc.text("2. Remaining balance payment due upon delivery / installation.", 14, finalY + 55.5);
        doc.text("3. Fabrication items customized as per agreed dimensions cannot be returned.", 14, finalY + 59);
      }
    }

    // --- 7. FOOTER & AUTHORIZED SIGNATORY (100% ENGLISH) ---
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 20;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(12, footerY, pageWidth - 12, footerY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Thank you for your business! Visit again.", 14, footerY + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Computer Generated Tax Invoice", 14, footerY + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`For ${shop.shopName} ${shop.businessCategory}`, pageWidth - 14, footerY + 6, {
      align: "right",
    });
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("Authorized Signatory", pageWidth - 14, footerY + 13, { align: "right" });

    return doc;
  }

  /**
   * Generates a clean, customer-friendly filename for invoice PDFs
   * Example: INV-1006_Suresh_Jadhav.pdf
   */
  public getInvoiceFilename(invoice: Invoice): string {
    const invNo = (invoice.invoiceNumber || "INV-BILL").trim();
    const cleanCustomerName = (invoice.customerName || "Customer")
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_");
    return `${invNo}_${cleanCustomerName}.pdf`;
  }

  public downloadInvoicePDF(invoice: Invoice, settings?: ShopSettings): void {
    const doc = this.generateInvoicePDF(invoice, settings);
    const filename = this.getInvoiceFilename(invoice);
    doc.save(filename);
  }

  public getInvoicePDFBlob(invoice: Invoice, settings?: ShopSettings): Blob {
    const doc = this.generateInvoicePDF(invoice, settings);
    return doc.output("blob");
  }

  /**
   * Shares PDF using native device sharing (Web Share API on iPad, Android, Windows, Mac)
   */
  public async shareInvoicePDF(invoice: Invoice, settings?: ShopSettings): Promise<boolean> {
    if (typeof window === "undefined" || !navigator.share) {
      return false;
    }

    try {
      const filename = this.getInvoiceFilename(invoice);
      const blob = this.getInvoicePDFBlob(invoice, settings);
      const file = new File([blob], filename, { type: "application/pdf" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${invoice.invoiceNumber}`,
          text: `Invoice ${invoice.invoiceNumber} for ${invoice.customerName} - Jai Mata Di`,
        });
        return true;
      }
      return false;
    } catch (e: any) {
      if (e?.name === "AbortError") {
        return true;
      }
      console.warn("Could not share PDF via Web Share API:", e);
      return false;
    }
  }

  public getInvoicePDFBase64(invoice: Invoice, settings?: ShopSettings): string {
    const doc = this.generateInvoicePDF(invoice, settings);
    return doc.output("datauristring");
  }

  public getInvoicePDFBuffer(invoice: Invoice, settings?: ShopSettings): Buffer {
    const doc = this.generateInvoicePDF(invoice, settings);
    const arrayBuffer = doc.output("arraybuffer");
    return Buffer.from(arrayBuffer);
  }
}

export const pdfService = new PDFService();
