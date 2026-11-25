"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  MessageCircle,
  Download,
  ExternalLink,
  FileText,
  CheckCircle2,
  Paperclip,
  Share2,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Invoice, ShopSettings } from "@/types";
import { pdfService } from "@/services/pdfService";
import { whatsappService } from "@/services/whatsappService";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";

interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  settings?: ShopSettings;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  invoice,
  settings,
}: WhatsAppShareModalProps) {
  const toast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  if (!invoice) return null;

  const filename = pdfService.getInvoiceFilename(invoice);

  const handleSharePersonalWhatsApp = async () => {
    setIsProcessing(true);
    try {
      const res = await whatsappService.shareInvoicePDFViaPersonalWhatsApp(invoice, settings);
      setHasTriggered(true);

      if (res.sharedViaNativeSheet) {
        toast.success("Opening WhatsApp with attached invoice PDF!");
      } else {
        toast.success(`Downloaded ${filename} and opened WhatsApp!`);
      }
    } catch (err: any) {
      toast.error("Could not complete sharing. Please download PDF manually.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadOnly = () => {
    try {
      pdfService.downloadInvoicePDF(invoice, settings);
      toast.success(`Downloaded ${filename}`);
    } catch {
      toast.error("Failed to download invoice PDF");
    }
  };

  const handleOpenWhatsAppChatOnly = () => {
    const url = whatsappService.getWhatsAppShareUrl(invoice.customerPhone);
    window.open(url, "_blank");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={`Share Invoice PDF — ${invoice.invoiceNumber}`}
    >
      <div className="space-y-4 text-sm text-slate-700">
        {/* Recipient & Document Summary Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="font-semibold text-slate-500">Customer:</span>
            <span className="font-bold text-slate-900">{invoice.customerName}</span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="font-semibold text-slate-500">WhatsApp Mobile:</span>
            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              +91 {invoice.customerPhone}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs sm:text-sm pt-1 border-t border-slate-200/80">
            <span className="font-semibold text-slate-500">Invoice Total:</span>
            <span className="font-bold text-slate-900">
              {formatCurrency(invoice.grandTotal)}{" "}
              <span className={`text-xs px-2 py-0.5 rounded font-black ${
                invoice.pendingAmount <= 0
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}>
                {invoice.pendingAmount <= 0 ? "PAID" : `DUE: ${formatCurrency(invoice.pendingAmount)}`}
              </span>
            </span>
          </div>
        </div>

        {/* Generated PDF File Badge */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-blue-950 uppercase tracking-wider">Official Tax Invoice Document</p>
            <p className="font-mono text-xs text-blue-900 font-bold truncate">{filename}</p>
          </div>
          <span className="text-[10px] font-bold bg-blue-200/70 text-blue-900 px-2 py-1 rounded-md shrink-0">
            PDF
          </span>
        </div>

        {/* Primary Action: Send PDF via Personal WhatsApp */}
        <div className="space-y-2 pt-1">
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={isProcessing}
            onClick={handleSharePersonalWhatsApp}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 py-3.5 text-sm sm:text-base flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Send PDF via Personal WhatsApp</span>
          </Button>
          <p className="text-center text-[11px] text-slate-500">
            Uses your personal WhatsApp (App or Web) • No Meta Cloud API needed
          </p>
        </div>

        {/* Step-by-Step Guidance (Shown prominently after clicking or for guidance) */}
        <div className={`p-4 rounded-2xl border transition-all ${
          hasTriggered
            ? "bg-emerald-50/60 border-emerald-300"
            : "bg-slate-50 border-slate-200"
        } space-y-2.5`}>
          <p className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            {hasTriggered ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-950">PDF Document Ready for WhatsApp</span>
              </>
            ) : (
              <>
                <Paperclip className="w-4 h-4 text-slate-600" />
                <span>How Document Sending Works:</span>
              </>
            )}
          </p>

          <ol className="text-xs space-y-2 text-slate-700">
            <li className="flex items-start gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                hasTriggered ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-800"
              }`}>
                {hasTriggered ? <Check className="w-3 h-3" /> : "1"}
              </span>
              <span>
                <strong>Generates & Downloads PDF:</strong> The official tax invoice PDF ({filename}) is saved to your device.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                hasTriggered ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-800"
              }`}>
                {hasTriggered ? <Check className="w-3 h-3" /> : "2"}
              </span>
              <span>
                <strong>Opens Customer Chat:</strong> Launches your personal WhatsApp directly with <strong>+91 {invoice.customerPhone}</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                3
              </span>
              <span>
                <strong>Attach & Send:</strong> In WhatsApp, tap the <strong>📎 (Paperclip / +)</strong> icon ➔ select <strong>Document</strong> ➔ pick the downloaded PDF to send!
              </span>
            </li>
          </ol>
        </div>

        {/* Secondary Direct Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleDownloadOnly}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs"
          >
            <Download className="w-4 h-4 mr-1.5 text-blue-600" />
            Download PDF
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={handleOpenWhatsAppChatOnly}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs"
          >
            <ExternalLink className="w-4 h-4 mr-1.5 text-emerald-600" />
            Open Chat Only
          </Button>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-200">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
