"use client";

import React, { useState } from "react";
import {
  Printer,
  Download,
  Share2,
  FileText,
  Building,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { Invoice, ShopSettings } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { storageService } from "@/services/storageService";
import { pdfService } from "@/services/pdfService";
import { whatsappService } from "@/services/whatsappService";
import { useToast } from "@/context/ToastContext";
import { UpiQrPaymentCard } from "./UpiQrPaymentCard";

interface InvoicePrintSheetProps {
  invoice: Invoice;
  customSettings?: ShopSettings;
  settings?: ShopSettings;
  onBack?: () => void;
}

export function InvoicePrintSheet({
  invoice,
  customSettings,
  settings: propSettings,
  onBack,
}: InvoicePrintSheetProps) {
  const toast = useToast();
  const settings = customSettings || propSettings || storageService.getSettings();

  const [printFormat, setPrintFormat] = useState<"A4" | "THERMAL">("A4");
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const [whatsAppLoadingText, setWhatsAppLoadingText] = useState("Sending...");

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      const filename = pdfService.getInvoiceFilename(invoice);
      pdfService.downloadInvoicePDF(invoice, settings);
      toast.success(`${filename} saved to device!`);
    } catch {
      toast.error("Failed to generate PDF. You can use standard Print.");
    }
  };

  const handleSharePDF = async () => {
    try {
      const shared = await pdfService.shareInvoicePDF(invoice, settings);
      if (shared) {
        toast.success("Invoice shared successfully!");
      } else {
        // Fallback to downloading if device share sheet is unsupported
        handleDownloadPDF();
      }
    } catch {
      handleDownloadPDF();
    }
  };

  const handleSendPDFWhatsApp = async () => {
    if (!invoice.customerPhone) {
      toast.error("Customer phone number is missing.");
      return;
    }

    setIsSendingWhatsApp(true);
    setWhatsAppLoadingText("Preparing PDF...");

    try {
      const res = await whatsappService.shareInvoicePDFViaPersonalWhatsApp(invoice, settings);
      if (res.sharedViaNativeSheet) {
        toast.success("Opening WhatsApp with attached invoice PDF!");
      } else {
        toast.success(`Downloaded ${res.filename}! In WhatsApp, tap 📎 to attach the PDF.`);
      }
    } catch (err: any) {
      toast.error("WhatsApp error: " + err?.message);
    } finally {
      setIsSendingWhatsApp(false);
      setWhatsAppLoadingText("Sending...");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => (onBack ? onBack() : window.history.back())}
            variant="ghost"
            size="sm"
            className="text-slate-600 font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <span className="text-sm font-bold text-slate-900">
            Invoice: <span className="font-mono text-blue-600">#{invoice.invoiceNumber}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Format Selector */}
          <div className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1 text-xs">
            <button
              onClick={() => setPrintFormat("A4")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                printFormat === "A4" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600"
              }`}
            >
              A4 Tax Invoice
            </button>
            <button
              onClick={() => setPrintFormat("THERMAL")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                printFormat === "THERMAL" ? "bg-white text-slate-900 shadow-sm font-bold" : "text-slate-600"
              }`}
            >
              80mm Thermal Receipt
            </button>
          </div>

          <Button
            onClick={handleDownloadPDF}
            variant="primary"
            size="md"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download PDF</span>
          </Button>

          <Button
            onClick={handleSharePDF}
            variant="outline"
            size="md"
            className="border-slate-300 text-slate-700 hover:bg-slate-50 font-bold"
            title="Share via AirDrop, WhatsApp, Files, or Mail"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden md:inline">Share</span>
          </Button>

          <Button
            onClick={handleSendPDFWhatsApp}
            variant="primary"
            size="md"
            disabled={isSendingWhatsApp}
            isLoading={isSendingWhatsApp}
            className="bg-emerald-600 hover:bg-emerald-700 font-bold"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{isSendingWhatsApp ? whatsAppLoadingText : "Send PDF on WhatsApp"}</span>
          </Button>

          <Button onClick={handlePrint} variant="primary" size="md" className="bg-slate-900 hover:bg-slate-800">
            <Printer className="w-4 h-4" />
            Print Now
          </Button>
        </div>
      </div>

      {/* --- A4 STANDARD INVOICE TEMPLATE --- */}
      {printFormat === "A4" && (
        <div className="print-container bg-white rounded-2xl border border-slate-300 shadow-md p-8 sm:p-12 max-w-4xl mx-auto text-slate-900 text-sm">
          
          {/* 1. TOP HEADER: TRADITIONAL & JAI MATA DI BRANDING */}
          <div className="text-center pb-4">
            {/* Traditional Header || SHREE || */}
            <p className="text-xs sm:text-sm font-black text-amber-700 tracking-widest mb-1">
              || SHREE ||
            </p>

            {/* Optional Logo Badge */}
            {settings.logoUrl && (
              <div className="flex justify-center my-1.5">
                <img
                  src={settings.logoUrl}
                  alt="Shop Logo"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-amber-500 shadow-sm"
                />
              </div>
            )}

            {/* Main Business Name */}
            <h1 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-1">
              JAI MATA DI
            </h1>

            {/* Business Category */}
            <p className="text-base sm:text-lg font-extrabold text-amber-800 mt-0.5">
              STEEL FURNITURE & RAILING
            </p>

            {/* Owner & Phone */}
            <div className="text-xs sm:text-sm font-bold text-slate-800 mt-2 space-y-0.5">
              <p>{settings.ownerName ? settings.ownerName.replace(/Proprietor:?\s*/gi, "Mr. ").replace(/Prop\.?\s*/gi, "Mr. ") : "Mr. Vaibhav Wagh"}</p>
              <p className="font-mono text-base font-black text-slate-950">
                +91 {settings.shopPhone || "9561482326"}
              </p>
            </div>

            {/* Address */}
            <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1 max-w-lg mx-auto">
              Naggaon Road, Bodwad, Dist. Jalgaon - 425310
            </p>

            {/* Optional Fields (Only if configured) */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1.5 font-medium">
              {settings.altPhone && <span><strong>Alt:</strong> +91 {settings.altPhone}</span>}
              {settings.email && <span><strong>Email:</strong> {settings.email}</span>}
              {settings.gstNumber && (
                <span>
                  <strong>GSTIN:</strong> <span className="font-mono">{settings.gstNumber}</span>
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="border-b-2 border-slate-900 my-4" />

          {/* 2. TAX INVOICE METADATA SECTION (BUG 1 FIX: Clean Non-Overlapping Structure) */}
          <div className="py-2 space-y-3">
            {/* Centered TAX INVOICE Badge */}
            <div className="text-center">
              <span className="inline-block bg-slate-950 text-white px-6 py-1.5 rounded-lg text-xs font-black tracking-widest uppercase shadow-sm">
                TAX INVOICE
              </span>
            </div>

            {/* Clean 2-Column Metadata Grid */}
            <div className="grid grid-cols-2 gap-4 items-center text-xs font-bold text-slate-800 border-b border-slate-200 pb-3">
              {/* Left Column: Dates */}
              <div className="space-y-1 text-left">
                <p className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Invoice Date:</span>
                  <span className="font-bold text-slate-900">{formatDate(invoice.date)}</span>
                </p>
                {invoice.dueDate && (
                  <p className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Due Date:</span>
                    <span className="font-bold text-slate-900">{formatDate(invoice.dueDate)}</span>
                  </p>
                )}
              </div>

              {/* Right Column: Invoice Number & Status Badge */}
              <div className="space-y-1.5 flex flex-col items-end">
                <p className="flex items-center gap-1.5 justify-end">
                  <span className="text-slate-500 font-medium">Invoice No:</span>
                  <span className="font-mono text-sm font-black text-blue-900">#{invoice.invoiceNumber}</span>
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-slate-500 font-medium text-[11px]">Status:</span>
                  <PaymentStatusBadge status={invoice.status} size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* 3. CUSTOMER DETAILS BOX */}
          <div className="my-5 p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bill To / Customer</p>
              <p className="text-base font-black text-slate-900 mt-0.5">{invoice.customerName}</p>
              <p className="text-xs text-slate-700 font-medium mt-1">
                <strong>Mobile:</strong> +91 {invoice.customerPhone}
              </p>
              {invoice.customerAddress && (
                <p className="text-xs text-slate-600 mt-1 leading-snug">{invoice.customerAddress}</p>
              )}
            </div>

            <div className="sm:text-right">
              {invoice.customerGst && (
                <p className="text-xs font-medium text-slate-700">
                  <strong>Customer GSTIN:</strong> <span className="font-mono">{invoice.customerGst}</span>
                </p>
              )}
              <p className="text-xs font-medium text-slate-600 mt-1">
                <strong>Payment Mode:</strong> {invoice.primaryPaymentMethod}
              </p>
              {invoice.notes && (
                <p className="text-xs text-slate-500 italic mt-2">Note: {invoice.notes}</p>
              )}
            </div>
          </div>

          {/* 4. ITEMIZED PRODUCTS / WORK TABLE (BUG 2 FIX: Clean Single Currency Formats) */}
          <div className="my-6 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-white text-xs uppercase font-bold tracking-wider">
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">Description of Work / Item</th>
                  <th className="p-3 text-right w-24">Qty / Unit</th>
                  <th className="p-3 text-right w-28">Rate</th>
                  <th className="p-3 text-right w-32">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
                {invoice.items.map((item, index) => (
                  <tr key={item.id || index} className="hover:bg-slate-50">
                    <td className="p-3 text-center text-slate-500 font-bold">{index + 1}</td>
                    <td className="p-3">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                      )}
                    </td>
                    <td className="p-3 text-right font-medium text-slate-700">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="p-3 text-right font-medium text-slate-700">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 5. TOTALS & DYNAMIC UPI QR PAYMENT SECTION */}
          <div className="my-6 flex flex-col md:flex-row justify-between items-start gap-6 pt-4 border-t-2 border-slate-900">
            {/* Left Side: Dynamic/Static UPI QR Code Card + Terms & Conditions */}
            <div className="flex-1 space-y-4 w-full">
              {/* UPI QR Code: Guaranteed on every invoice (paid, partial, unpaid) */}
              <div className="max-w-md">
                <UpiQrPaymentCard
                  upiId={settings.upiId || "9561482326@ybl"}
                  payeeName={settings.shopName || "JAI MATA DI"}
                  grandTotal={invoice.grandTotal}
                  paidAmount={invoice.paidAmount}
                  pendingAmount={invoice.pendingAmount}
                  invoiceNumber={invoice.invoiceNumber}
                  customerName={invoice.customerName}
                  showSummary={false}
                  showActions={false}
                />
              </div>

              {settings.termsAndConditions && (
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Terms & Conditions</p>
                  <p className="text-slate-600 whitespace-pre-line text-xs leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    {settings.termsAndConditions}
                  </p>
                </div>
              )}

              <div className="text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-800">Thank you for your business! Visit again.</p>
                <p className="text-[11px] text-slate-400">This is a computer generated tax invoice.</p>
              </div>
            </div>

            {/* Right Side: Totals Financial Breakdown */}
            <div className="w-full md:w-80 space-y-4">
              {/* Financial Breakdown Table */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 text-xs sm:text-sm space-y-2">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Subtotal:</span>
                  <span className="text-slate-900 font-bold">{formatCurrency(invoice.subtotal)}</span>
                </div>

                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between font-black text-base text-slate-950 pt-2 border-t-2 border-slate-300">
                  <span>Grand Total:</span>
                  <span className="text-blue-950">{formatCurrency(invoice.grandTotal)}</span>
                </div>

                <div className="flex justify-between font-bold text-emerald-700 pt-1">
                  <span>Advance Payment:</span>
                  <span className="font-extrabold">{formatCurrency(invoice.paidAmount)}</span>
                </div>

                <div className="flex justify-between font-black text-base pt-2 border-t border-slate-200">
                  <span className="text-rose-700">Pending Balance:</span>
                  <span className={`font-black ${invoice.pendingAmount > 0 ? "text-rose-700 text-lg" : "text-emerald-700 text-lg"}`}>
                    {formatCurrency(invoice.pendingAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. FOOTER & AUTHORIZED SIGNATORY */}
          <div className="mt-12 pt-6 border-t border-slate-300 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-slate-500 print-avoid-break">
            <div className="text-left space-y-1">
              <p className="font-bold text-slate-800">Thank you for your business! Visit again.</p>
              <p className="text-[11px] text-slate-400">This is a computer generated invoice.</p>
            </div>

            <div className="text-center sm:text-right space-y-8">
              <p className="font-bold text-slate-800">For JAI MATA DI STEEL FURNITURE & RAILING</p>
              <div className="border-t border-slate-400 pt-1 px-8 inline-block font-semibold text-slate-600 text-[11px]">
                Authorized Signatory
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- 80MM THERMAL RECEIPT TEMPLATE --- */}
      {printFormat === "THERMAL" && (
        <div className="print-container bg-white border border-slate-300 shadow-md p-6 max-w-sm mx-auto text-slate-950 font-mono text-xs space-y-3">
          <div className="text-center space-y-0.5 mb-2">
            <p className="text-xs font-black text-amber-700">{settings.headerTradition || "|| Shree ||"}</p>
            <h2 className="text-base font-black tracking-tight uppercase">{settings.shopName || "JAI MATA DI"}</h2>
            <p className="text-[11px] font-bold text-slate-700">{settings.businessCategory || "STEEL FURNITURE & RAILING"}</p>
            <p className="text-[10px] font-semibold">{settings.ownerName ? settings.ownerName.replace(/Proprietor:?\s*/gi, "Mr. ").replace(/Prop\.?\s*/gi, "Mr. ") : "Mr. Vaibhav Wagh"}</p>
            <p className="text-[11px] font-black">Ph: {settings.shopPhone}</p>
            <p className="text-[10px] text-slate-600">{settings.shopAddress || "Naggaon Road, Bodwad, Dist. Jalgaon"}</p>
            {settings.gstNumber && <p className="text-[10px] font-mono">GSTIN: {settings.gstNumber}</p>}
            <div className="border-b-2 border-dashed border-slate-400 my-2" />
            <p className="font-black text-xs">TAX INVOICE: #{invoice.invoiceNumber}</p>
            <p className="text-[10px] text-slate-600">Date: {formatDate(invoice.date)}</p>
            {invoice.dueDate && <p className="text-[10px] text-slate-600">Due Date: {formatDate(invoice.dueDate)}</p>}
            <p className="text-[11px] font-bold text-left mt-2">Cust: {invoice.customerName} ({invoice.customerPhone})</p>
          </div>

          <div className="border-b-2 border-dashed border-slate-400 my-2" />

          {/* Items */}
          <div className="space-y-1.5">
            {invoice.items.map((it, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                  <p className="font-bold">{it.name}</p>
                  <p className="text-[10px] text-slate-600">{it.quantity} {it.unit} x {formatCurrency(it.unitPrice)}</p>
                </div>
                <p className="font-bold text-right">{formatCurrency(it.total)}</p>
              </div>
            ))}
          </div>

          <div className="border-b-2 border-dashed border-slate-400 my-2" />

          {/* Totals */}
          <div className="space-y-1 text-right">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-{formatCurrency(invoice.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-300">
              <span>Grand Total:</span>
              <span>{formatCurrency(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Paid:</span>
              <span>{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="flex justify-between font-black text-sm text-rose-700">
              <span>Balance Due:</span>
              <span>{formatCurrency(invoice.pendingAmount)}</span>
            </div>
          </div>

          <div className="border-b-2 border-dashed border-slate-400 my-3" />

          {/* Thermal UPI Payment QR Code */}
          <div className="flex flex-col items-center justify-center my-2">
            <UpiQrPaymentCard
              upiId={settings.upiId || "9561482326@ybl"}
              payeeName={settings.shopName || "JAI MATA DI"}
              grandTotal={invoice.grandTotal}
              paidAmount={invoice.paidAmount}
              pendingAmount={invoice.pendingAmount}
              invoiceNumber={invoice.invoiceNumber}
              customerName={invoice.customerName}
              compact={true}
              showSummary={false}
              showActions={false}
            />
          </div>

          <div className="border-b-2 border-dashed border-slate-400 my-3" />

          <div className="text-center space-y-1 text-[10px]">
            <p className="font-bold">{settings.invoiceFooterMessage || "Thank you! Visit again."}</p>
          </div>
        </div>
      )}
    </div>
  );
}
