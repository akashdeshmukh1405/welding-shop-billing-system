"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Receipt,
  ArrowLeft,
  Printer,
  MessageCircle,
  CreditCard,
  Edit,
  Trash2,
  Calendar,
  User,
  Phone,
  MapPin,
  Building,
  CheckCircle2,
  Clock,
  History,
  QrCode,
  Download,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { PaymentStatusBadge, PaymentMethodBadge } from "@/components/ui/Badge";
import { PaymentCollectorModal } from "@/components/billing/PaymentCollectorModal";
import { InvoicePrintSheet } from "@/components/billing/InvoicePrintSheet";
import { UpiQrPaymentCard } from "@/components/billing/UpiQrPaymentCard";
import { UpiQrModal } from "@/components/billing/UpiQrModal";
import { WhatsAppShareModal } from "@/components/billing/WhatsAppShareModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { storageService } from "@/services/storageService";
import { invoiceService } from "@/services/invoiceService";
import { whatsappService } from "@/services/whatsappService";
import { pdfService } from "@/services/pdfService";
import { useToast } from "@/context/ToastContext";
import { Invoice, ShopSettings } from "@/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default function BillDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  const id = params.id as string;
  const isPrintMode = searchParams.get("print") === "true";

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<ShopSettings>(storageService.getSettings());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [viewPrintTemplate, setViewPrintTemplate] = useState(isPrintMode);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const loadData = () => {
    const inv = invoiceService.getInvoiceById(id);
    if (inv) {
      setInvoice(inv);
    } else {
      toast.error("Invoice not found");
      router.push("/bills");
    }
    setSettings(storageService.getSettings());
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (!invoice) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-slate-500 font-medium">Loading invoice details...</p>
      </div>
    );
  }

  const handleDownloadPDF = () => {
    try {
      pdfService.downloadInvoicePDF(invoice, settings);
      toast.success(`Downloaded ${invoice.invoiceNumber}.pdf`);
    } catch (e: any) {
      toast.error("Failed to generate PDF download");
    }
  };

  const handleDelete = () => {
    const ok = invoiceService.deleteInvoice(invoice.id);
    if (ok) {
      toast.success(`Invoice ${invoice.invoiceNumber} deleted`);
      router.push("/bills");
    } else {
      toast.error("Failed to delete invoice");
    }
  };

  // If in Print Sheet View
  if (viewPrintTemplate) {
    return (
      <InvoicePrintSheet
        invoice={invoice}
        settings={settings}
        onBack={() => setViewPrintTemplate(false)}
      />
    );
  }

  return (
    <>
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        {/* Navigation & Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="md" onClick={() => router.push("/bills")}>
              <ArrowLeft className="w-4 h-4" />
              Bills
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {invoice.invoiceNumber}
                </h1>
                <PaymentStatusBadge status={invoice.status} size="md" />
              </div>
              <p className="text-xs text-slate-500">
                Created on {formatDate(invoice.date)}
              </p>
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Show UPI QR button when balance pending */}
            {invoice.pendingAmount > 0 && (
              <Button
                onClick={() => setShowQrModal(true)}
                variant="outline"
                size="md"
                className="text-blue-700 hover:bg-blue-50 border-blue-300 font-bold"
                title="Display dynamic UPI QR code for remaining balance"
              >
                <QrCode className="w-4 h-4 mr-1.5" />
                Pay via QR
              </Button>
            )}

            {/* Collect Payment: Only show when pendingAmount > 0 */}
            {invoice.pendingAmount > 0 && (
              <Button
                onClick={() => setShowPaymentModal(true)}
                variant="success"
                size="md"
                className="font-bold shadow-md shadow-emerald-600/20"
              >
                <CreditCard className="w-4 h-4" />
                Collect Payment
              </Button>
            )}

            {/* Print Now */}
            <Button
              onClick={() => setViewPrintTemplate(true)}
              variant="primary"
              size="md"
              className="bg-slate-900 hover:bg-slate-800"
            >
              <Printer className="w-4 h-4" />
              Print Now
            </Button>

            {/* Download PDF */}
            <Button
              onClick={handleDownloadPDF}
              variant="primary"
              size="md"
              className="bg-blue-600 hover:bg-blue-700 font-bold shadow-sm shadow-blue-500/20"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>

            {/* Send PDF on WhatsApp */}
            <Button
              onClick={() => setShowWhatsAppModal(true)}
              variant="primary"
              size="md"
              className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md shadow-emerald-600/20"
            >
              <MessageCircle className="w-4 h-4" />
              Send PDF on WhatsApp
            </Button>

            {/* Edit */}
            <Button
              onClick={() => router.push(`/bills/${invoice.id}/edit`)}
              variant="outline"
              size="md"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Button>

            {/* Delete */}
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="ghost"
              size="md"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Bill Overview Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Box */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <User className="w-4 h-4 text-blue-600" />
              Customer Information
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">{invoice.customerName}</h3>
              <p className="text-sm font-semibold text-slate-700 mt-0.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                +91 {invoice.customerPhone}
              </p>
              {invoice.customerAddress && (
                <p className="text-xs text-slate-500 mt-2 flex items-start gap-1.5 leading-relaxed">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                  {invoice.customerAddress}
                </p>
              )}
              {invoice.customerGst && (
                <p className="text-xs font-semibold text-slate-600 mt-2">
                  GSTIN: <span className="font-mono">{invoice.customerGst}</span>
                </p>
              )}
            </div>
          </Card>

          {/* Invoice Dates Box */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-amber-600" />
              Invoice Timeline
            </div>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Invoice Date:</span>
                <span className="font-bold text-slate-800">{formatDate(invoice.date)}</span>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Promised Delivery:</span>
                  <span className="font-bold text-slate-800">{formatDate(invoice.dueDate)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Initial Mode:</span>
                <PaymentMethodBadge method={invoice.primaryPaymentMethod} />
              </div>
              {invoice.notes && (
                <p className="text-xs text-slate-600 pt-2 border-t border-slate-100 italic">
                  &ldquo;{invoice.notes}&rdquo;
                </p>
              )}
            </div>
          </Card>

          {/* Payment Balance Box */}
          <Card
            className={`p-5 space-y-3 border-2 ${
              invoice.pendingAmount > 0 ? "border-rose-200 bg-rose-50/40" : "border-emerald-200 bg-emerald-50/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Payment Status</span>
              <PaymentStatusBadge status={invoice.status} size="sm" />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-semibold">Grand Total:</span>
                <span className="font-extrabold text-slate-900">{formatCurrency(invoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-semibold">Paid Amount:</span>
                <span className="font-bold text-emerald-700">{formatCurrency(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-slate-200 font-black">
                <span className={invoice.pendingAmount > 0 ? "text-rose-700" : "text-emerald-700"}>
                  Remaining Due:
                </span>
                <span className={invoice.pendingAmount > 0 ? "text-rose-700 text-lg" : "text-emerald-700 text-lg"}>
                  {formatCurrency(invoice.pendingAmount)}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* UPI QR Card: Always shown on every invoice (pending, partial, or fully paid) */}
        {(() => {
          const upiId = settings.upiId || "9561482326@ybl";
          return (
            <div
              className={`bg-white rounded-2xl border-2 ${
                invoice.pendingAmount <= 0 ? "border-emerald-300" : "border-rose-200"
              } p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6`}
            >
              <div className="space-y-2 max-w-md">
                {invoice.pendingAmount <= 0 ? (
                  <>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs tracking-wide">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      PAID – NO PAYMENT DUE
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Bill Fully Paid & Settled
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      This invoice is fully settled with zero outstanding balance. The shop&apos;s static UPI QR code is displayed below for customer records and general shop payments.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-xs uppercase">
                      <QrCode className="w-3.5 h-3.5" />
                      {invoice.paidAmount === 0 ? "Full Balance Payable QR" : "Remaining Balance Payable QR"}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      Scan to Pay Balance: {formatCurrency(invoice.pendingAmount)}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      This QR code dynamically represents the exact remaining balance due ({formatCurrency(invoice.pendingAmount)}). Present this on your tablet or counter for instant customer scan via PhonePe, Google Pay, Paytm, or any BHIM UPI app.
                    </p>
                  </>
                )}
                <div className="text-xs font-mono font-bold text-slate-700 bg-slate-100 py-1 px-2.5 rounded-lg inline-block border border-slate-200">
                  Shop UPI: <span className="text-blue-700">{upiId}</span>
                </div>
              </div>

              <div className="w-full md:w-80">
                <UpiQrPaymentCard
                  upiId={upiId}
                  payeeName={settings.shopName || "JAI MATA DI"}
                  grandTotal={invoice.grandTotal}
                  paidAmount={invoice.paidAmount}
                  pendingAmount={invoice.pendingAmount}
                  invoiceNumber={invoice.invoiceNumber}
                  customerName={invoice.customerName}
                  showSummary={false}
                  showActions={true}
                />
              </div>
            </div>
          );
        })()}

        {/* Itemized Table Card */}
        <Card>
          <CardHeader>
            <CardTitle>Billed Items & Fabrication Work</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4 w-12 text-center">#</th>
                  <th className="p-4">Item & Description</th>
                  <th className="p-4 text-center">Qty</th>
                  <th className="p-4 text-center">Unit</th>
                  <th className="p-4 text-right">Rate</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {invoice.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/60">
                    <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                      )}
                    </td>
                    <td className="p-4 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="p-4 text-center text-slate-600 font-medium">{item.unit}</td>
                    <td className="p-4 text-right font-medium text-slate-700">{formatCurrency(item.unitPrice)}</td>
                    <td className="p-4 text-right font-extrabold text-slate-900">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Payment History Timeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-600" />
              <CardTitle>Payment History & Receipts ({invoice.payments?.length || 0})</CardTitle>
            </div>
            {invoice.pendingAmount > 0 && (
              <Button
                onClick={() => setShowPaymentModal(true)}
                variant="success"
                size="sm"
                className="font-bold text-xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Collect Balance
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!invoice.payments || invoice.payments.length === 0 ? (
              <p className="text-sm text-slate-400 italic py-3">No payments recorded for this bill yet.</p>
            ) : (
              <div className="space-y-3">
                {invoice.payments.map((p, index) => (
                  <div
                    key={p.id || index}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        ✓
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">{formatCurrency(p.amount)}</span>
                          <PaymentMethodBadge method={p.paymentMethod} />
                        </div>
                        {p.referenceNote && (
                          <p className="text-xs text-slate-500 mt-0.5">{p.referenceNote}</p>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">{formatDate(p.date)}</p>
                      {p.time && <p>{p.time}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collect Payment Modal */}
        <PaymentCollectorModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          invoice={invoice}
          onPaymentSuccess={loadData}
        />

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDelete}
          title="Delete Invoice?"
          message={`Are you sure you want to permanently delete invoice ${invoice.invoiceNumber}? This cannot be undone.`}
          confirmText="Delete Bill"
        />
      </div>

      {/* WhatsApp Share & Cloud API Modal */}
      <WhatsAppShareModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        invoice={invoice}
        settings={settings}
      />

      {/* Dynamic UPI QR Modal */}
      <UpiQrModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        invoice={invoice}
        settings={settings}
      />
    </>
  );
}
