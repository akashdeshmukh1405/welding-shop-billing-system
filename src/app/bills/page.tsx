"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Receipt,
  Search,
  PlusCircle,
  Filter,
  ArrowUpDown,
  Printer,
  MessageCircle,
  CreditCard,
  Trash2,
  Eye,
  SlidersHorizontal,
  Download,
  AlertCircle,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { PaymentStatusBadge, PaymentMethodBadge } from "@/components/ui/Badge";
import { PaymentCollectorModal } from "@/components/billing/PaymentCollectorModal";
import { UpiQrModal } from "@/components/billing/UpiQrModal";
import { WhatsAppShareModal } from "@/components/billing/WhatsAppShareModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { storageService } from "@/services/storageService";
import { invoiceService } from "@/services/invoiceService";
import { whatsappService } from "@/services/whatsappService";
import { pdfService } from "@/services/pdfService";
import { useToast } from "@/context/ToastContext";
import { Invoice, PaymentStatus } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

function BillsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialTab = searchParams.get("tab") || "ALL";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest_pending" | "highest_total">("newest");
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [selectedQrInvoice, setSelectedQrInvoice] = useState<Invoice | null>(null);
  const [selectedWhatsAppInvoice, setSelectedWhatsAppInvoice] = useState<Invoice | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  const loadInvoices = () => {
    const list = invoiceService.getInvoices({
      query: searchQuery,
      status: activeTab as any,
      sortBy: sortBy,
    });
    setInvoices(list);
  };

  useEffect(() => {
    loadInvoices();
  }, [activeTab, searchQuery, sortBy]);

  const allInvoices = storageService.getInvoices();
  const paidCount = allInvoices.filter((i) => i.status === "PAID" || i.pendingAmount === 0).length;
  const partialCount = allInvoices.filter((i) => i.status === "PARTIAL").length;
  const pendingCount = allInvoices.filter((i) => i.status === "PENDING").length;

  const tabItems = [
    { id: "ALL", label: "All Bills", count: allInvoices.length },
    { id: "PENDING", label: "Pending (Unpaid)", count: pendingCount },
    { id: "PARTIAL", label: "Partial Advance", count: partialCount },
    { id: "PAID", label: "Paid / Completed", count: paidCount },
  ];

  const handleDownloadPDF = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      pdfService.downloadInvoicePDF(inv);
      toast.success(`Downloaded ${inv.invoiceNumber}.pdf`);
    } catch {
      toast.error("Failed to generate PDF");
    }
  };

  const handleWhatsApp = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedWhatsAppInvoice(inv);
  };

  const handlePrint = (inv: Invoice, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/bills/${inv.id}?print=true`);
  };

  const handleDeleteConfirm = () => {
    if (!invoiceToDelete) return;
    const ok = invoiceService.deleteInvoice(invoiceToDelete.id);
    if (ok) {
      toast.success(`Invoice ${invoiceToDelete.invoiceNumber} deleted`);
      loadInvoices();
    } else {
      toast.error("Failed to delete invoice");
    }
    setInvoiceToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Bills & Invoices
          </h1>
          <p className="text-xs text-slate-500">
            Manage all customer bills, payment statuses, PDF downloads, and receipts
          </p>
        </div>

        <Button
          onClick={() => router.push("/bills/new")}
          variant="primary"
          size="lg"
          className="font-bold shadow-md shadow-blue-500/20"
        >
          <PlusCircle className="w-5 h-5" />
          Create New Bill
        </Button>
      </div>

      {/* Tabs / Filters Bar */}
      <div className="space-y-4">
        <Tabs items={tabItems} activeTab={activeTab} onChange={setActiveTab} />

        {/* Search & Sort Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="w-full sm:w-96">
            <Input
              placeholder="Search by Bill No, Customer, Mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-semibold text-slate-500 hidden md:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-11 px-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_pending">Highest Pending Amount</option>
              <option value="highest_total">Highest Bill Amount</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices List / Cards */}
      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No bills found"
          description={
            searchQuery
              ? `No invoices match your search "${searchQuery}"`
              : activeTab === "PAID"
              ? "No bills currently fully paid. Once payments are completed, they appear here."
              : "No bills match the selected filter."
          }
          actionLabel="Create New Bill"
          onAction={() => router.push("/bills/new")}
        />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card
              key={inv.id}
              onClick={() => router.push(`/bills/${inv.id}`)}
              className="p-4 sm:p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Bill Information */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-black flex-shrink-0">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-slate-900 text-base">{inv.invoiceNumber}</span>
                      <PaymentStatusBadge status={inv.status} size="sm" />
                      <PaymentMethodBadge method={inv.primaryPaymentMethod} />
                    </div>
                    <p className="text-base font-bold text-slate-800 mt-1">
                      {inv.customerName}
                      <span className="text-xs font-medium text-slate-500 ml-2">{inv.customerPhone}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {formatDate(inv.date)} • {inv.items.map((i) => `${i.name} (${i.quantity} ${i.unit})`).join(", ")}
                    </p>
                  </div>
                </div>

                {/* Right Financials & Action Buttons */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="text-left lg:text-right">
                    <div className="flex items-center lg:justify-end gap-2">
                      <span className="text-xs font-semibold text-slate-400">Total:</span>
                      <span className="text-lg font-black text-slate-900">{formatCurrency(inv.grandTotal)}</span>
                    </div>
                    <div className="flex items-center lg:justify-end gap-2 text-xs">
                      <span className="text-emerald-700 font-bold">Paid: {formatCurrency(inv.paidAmount)}</span>
                      {inv.pendingAmount > 0 && (
                        <span className="text-rose-700 font-black">
                          • Due: {formatCurrency(inv.pendingAmount)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
                    {inv.pendingAmount > 0 && (
                      <>
                        <Button
                          onClick={() => setSelectedQrInvoice(inv)}
                          variant="outline"
                          size="sm"
                          className="text-blue-700 hover:bg-blue-50 border-blue-300 h-9 px-2"
                          title="Display Dynamic UPI Payment QR"
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => setSelectedInvoiceForPayment(inv)}
                          variant="success"
                          size="sm"
                          className="font-bold text-xs h-9 px-3"
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1" />
                          Collect
                        </Button>
                      </>
                    )}

                    <Button
                      onClick={(e) => handleDownloadPDF(inv, e)}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-9 px-2.5"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </Button>

                    <Button
                      onClick={(e) => handleWhatsApp(inv, e)}
                      variant="outline"
                      size="sm"
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-9 px-2.5"
                      title="Send PDF on WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>

                    <Button
                      onClick={(e) => handlePrint(inv, e)}
                      variant="outline"
                      size="sm"
                      className="text-slate-700 hover:bg-slate-100 h-9 px-2.5"
                      title="Print A4"
                    >
                      <Printer className="w-4 h-4" />
                    </Button>

                    <Button
                      onClick={() => router.push(`/bills/${inv.id}`)}
                      variant="secondary"
                      size="sm"
                      className="h-9 px-3"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>

                    <Button
                      onClick={() => setInvoiceToDelete(inv)}
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-9 px-2"
                      title="Delete Bill"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Collect Payment Modal */}
      <PaymentCollectorModal
        isOpen={!!selectedInvoiceForPayment}
        onClose={() => setSelectedInvoiceForPayment(null)}
        invoice={selectedInvoiceForPayment}
        onPaymentSuccess={loadInvoices}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Invoice?"
        message={`Are you sure you want to permanently delete invoice ${invoiceToDelete?.invoiceNumber}? All payment records associated with this bill will also be removed.`}
        confirmText="Delete"
      />

      {/* WhatsApp Share & Cloud API Modal */}
      <WhatsAppShareModal
        isOpen={!!selectedWhatsAppInvoice}
        onClose={() => setSelectedWhatsAppInvoice(null)}
        invoice={selectedWhatsAppInvoice}
      />

      {/* Dynamic UPI QR Modal */}
      <UpiQrModal
        isOpen={!!selectedQrInvoice}
        onClose={() => setSelectedQrInvoice(null)}
        invoice={selectedQrInvoice}
      />
    </div>
  );
}

export default function BillsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading bills...</div>}>
      <BillsContent />
    </Suspense>
  );
}
