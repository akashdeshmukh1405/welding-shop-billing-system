"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  CheckCircle2,
  Printer,
  Download,
  MessageCircle,
  PlusCircle,
  ArrowRight,
  ExternalLink,
  FileText,
  User,
  Phone,
} from "lucide-react";
import { Invoice } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { pdfService } from "@/services/pdfService";
import { whatsappService } from "@/services/whatsappService";
import { useToast } from "@/context/ToastContext";
import confetti from "canvas-confetti";

interface BillSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export function BillSuccessModal({ isOpen, onClose, invoice }: BillSuccessModalProps) {
  const router = useRouter();
  const toast = useToast();
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  // Trigger celebration confetti on modal open
  React.useEffect(() => {
    if (isOpen) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch (e) {
        // Ignore confetti errors if canvas not supported
      }
    }
  }, [isOpen]);

  if (!invoice) return null;

  const filename = pdfService.getInvoiceFilename(invoice);

  const handlePrint = () => {
    onClose();
    router.push(`/bills/${invoice.id}?print=true`);
  };

  const handleDownloadPDF = () => {
    try {
      pdfService.downloadInvoicePDF(invoice);
      toast.success(`Downloaded ${filename}`);
    } catch (e: any) {
      toast.error("Failed to generate PDF download");
    }
  };

  const handleSendPDFWhatsApp = async () => {
    if (isSendingWhatsApp) return;

    setIsSendingWhatsApp(true);

    try {
      const res = await whatsappService.shareInvoicePDFViaPersonalWhatsApp(invoice);

      if (res.sharedViaNativeSheet) {
        toast.success("Opening WhatsApp with attached invoice PDF!");
      } else {
        toast.success(`Downloaded ${filename}! In WhatsApp, tap 📎 to attach the PDF.`);
      }
    } catch {
      toast.error("Unable to share PDF on WhatsApp. Please download PDF manually.");
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const handleCreateNew = () => {
    onClose();
    window.location.href = "/bills/new";
  };

  const handleViewDetails = () => {
    onClose();
    router.push(`/bills/${invoice.id}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" showCloseButton={false}>
      <div className="text-center space-y-5 pt-1">
        {/* Success Icon */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-1">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">BILL CREATED SUCCESSFULLY</h3>
          <p className="text-sm font-semibold text-slate-500">
            Invoice: <span className="text-blue-700 font-bold font-mono">{invoice.invoiceNumber}</span> • {formatDate(invoice.date)}
          </p>
        </div>

        {/* Financial Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2.5">
          <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
            <span>Customer</span>
            <span className="text-slate-900 font-bold">{invoice.customerName} ({invoice.customerPhone})</span>
          </div>
          <div className="flex justify-between items-center text-sm font-semibold text-slate-700">
            <span>Total Bill Amount</span>
            <span className="text-base font-bold text-slate-950">{formatCurrency(invoice.grandTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-semibold text-emerald-700">
            <span>Advance / Paid Amount</span>
            <span className="text-base font-bold">₹{invoice.paidAmount.toLocaleString("en-IN")}</span>
          </div>

          <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
            <span className="font-bold text-sm text-slate-800">Remaining Balance</span>
            <span className={`text-base font-black ${invoice.pendingAmount > 0 ? "text-amber-600" : "text-emerald-700"}`}>
              {invoice.pendingAmount > 0 ? `₹${invoice.pendingAmount.toLocaleString("en-IN")}` : "PAID IN FULL (₹0)"}
            </span>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="space-y-2.5 pt-1">
          {/* Print Bill */}
          <Button
            onClick={handlePrint}
            variant="outline"
            size="md"
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold h-12 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Receipt / Invoice
          </Button>

          {/* Download PDF */}
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            size="md"
            className="w-full border-blue-200 text-blue-900 hover:bg-blue-50 font-bold h-12"
          >
            <Download className="w-4 h-4 text-blue-600" />
            Download Invoice PDF
          </Button>

          {/* Send PDF on Personal WhatsApp */}
          <Button
            onClick={handleSendPDFWhatsApp}
            variant="primary"
            size="md"
            disabled={isSendingWhatsApp}
            isLoading={isSendingWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-md shadow-emerald-600/20"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Send PDF on Personal WhatsApp</span>
          </Button>
        </div>

        {/* Secondary Links */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <Button onClick={handleCreateNew} variant="outline" size="md" className="flex-1 font-semibold">
            <PlusCircle className="w-4 h-4 text-blue-600" />
            New Bill
          </Button>

          <Button onClick={handleViewDetails} variant="ghost" size="md" className="flex-1 text-slate-700 font-semibold">
            View Bill
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
