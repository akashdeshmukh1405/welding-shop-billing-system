"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  Search,
  CreditCard,
  MessageCircle,
  Eye,
  CheckCircle2,
  QrCode,
  Download,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { PaymentCollectorModal } from "@/components/billing/PaymentCollectorModal";
import { UpiQrModal } from "@/components/billing/UpiQrModal";
import { WhatsAppShareModal } from "@/components/billing/WhatsAppShareModal";
import { EmptyState } from "@/components/common/EmptyState";
import { storageService } from "@/services/storageService";
import { Invoice } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PendingBillsPage() {
  const router = useRouter();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customerPendingMap, setCustomerPendingMap] = useState<Record<string, { totalPending: number; billCount: number }>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "PARTIAL">("ALL");
  const [sortBy, setSortBy] = useState<"highest_pending" | "newest" | "oldest">("highest_pending");

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedQrInvoice, setSelectedQrInvoice] = useState<Invoice | null>(null);
  const [selectedWhatsAppInvoice, setSelectedWhatsAppInvoice] = useState<Invoice | null>(null);

  const loadPendingBills = () => {
    const allInvoices = storageService.getInvoices();
    let list = allInvoices.filter((inv) => inv.pendingAmount > 0);

    // Compute consolidated outstanding per customer
    const map: Record<string, { totalPending: number; billCount: number }> = {};
    allInvoices.forEach((inv) => {
      if (inv.pendingAmount > 0) {
        const key = inv.customerId || inv.customerPhone;
        if (!map[key]) {
          map[key] = { totalPending: 0, billCount: 0 };
        }
        map[key].totalPending += inv.pendingAmount;
        map[key].billCount += 1;
      }
    });
    setCustomerPendingMap(map);

    if (filterStatus !== "ALL") {
      list = list.filter((inv) => inv.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          inv.customerPhone.includes(q)
      );
    }

    if (sortBy === "highest_pending") {
      list.sort((a, b) => b.pendingAmount - a.pendingAmount);
    } else if (sortBy === "newest") {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === "oldest") {
      list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }

    setInvoices(list);
  };

  useEffect(() => {
    loadPendingBills();
  }, [searchQuery, filterStatus, sortBy]);

  const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.pendingAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header & Outstanding Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-rose-900 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-rose-400" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Pending Payments</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Track, present dynamic UPI QR codes, and collect pending balances from customers
          </p>
        </div>

        <div className="bg-rose-950/80 border border-rose-700/50 p-4 rounded-2xl text-left md:text-right flex-shrink-0">
          <p className="text-xs font-bold text-rose-300 uppercase">Total Outstanding</p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1">
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="text-[11px] text-rose-200/80 mt-0.5">{invoices.length} Bills Pending</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-96">
          <Input
            placeholder="Search by customer, mobile, or bill no..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Status Filter */}
          <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1 text-xs font-bold">
            <button
              onClick={() => setFilterStatus("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === "ALL" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Due
            </button>
            <button
              onClick={() => setFilterStatus("PARTIAL")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === "PARTIAL" ? "bg-amber-500 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Partial
            </button>
            <button
              onClick={() => setFilterStatus("PENDING")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === "PENDING" ? "bg-rose-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Unpaid
            </button>
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-10 px-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold cursor-pointer"
          >
            <option value="highest_pending">Highest Pending</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Pending Bills Grid / List */}
      {invoices.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No pending payments found 🎉"
          description={
            searchQuery
              ? `No pending bills match your search "${searchQuery}"`
              : "Great job! All customer accounts are settled in full."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {invoices.map((inv) => (
            <Card
              key={inv.id}
              onClick={() => router.push(`/bills/${inv.id}`)}
              className="p-5 border-2 border-rose-100 hover:border-rose-300 transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-base group-hover:text-blue-600 transition-colors">
                        {inv.invoiceNumber}
                      </span>
                      <PaymentStatusBadge status={inv.status} size="sm" />
                    </div>
                    <p className="font-extrabold text-slate-800 text-base mt-1">{inv.customerName}</p>
                    <p className="text-xs text-slate-500 font-medium">+91 {inv.customerPhone}</p>
                    {customerPendingMap[inv.customerId || inv.customerPhone]?.billCount > 1 && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[11px] rounded-md border border-rose-200">
                        Total Customer Due: {formatCurrency(customerPendingMap[inv.customerId || inv.customerPhone].totalPending)} ({customerPendingMap[inv.customerId || inv.customerPhone].billCount} bills)
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Pending Due</p>
                    <p className="text-2xl font-black text-rose-700 mt-0.5">
                      {formatCurrency(inv.pendingAmount)}
                    </p>
                  </div>
                </div>

                {/* Bill Items summary */}
                <div className="mt-3 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>Total Billed:</span>
                    <span className="text-slate-900">{formatCurrency(inv.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Already Paid:</span>
                    <span className="text-emerald-700">{formatCurrency(inv.paidAmount)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-200 truncate">
                    Date: {formatDate(inv.date)} • {inv.items.map((i) => i.name).join(", ")}
                  </p>
                </div>
              </div>

              {/* Bottom Touch Actions */}
              <div
                className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={() => setSelectedQrInvoice(inv)}
                    variant="outline"
                    size="sm"
                    className="text-blue-700 hover:bg-blue-50 border-blue-300 text-xs font-bold"
                    title="Display dynamic UPI QR code for remaining balance"
                  >
                    <QrCode className="w-3.5 h-3.5 mr-1" />
                    Pay QR
                  </Button>

                  <Button
                    onClick={() => setSelectedWhatsAppInvoice(inv)}
                    variant="outline"
                    size="sm"
                    className="text-emerald-700 hover:bg-emerald-50 border-emerald-300 text-xs font-bold"
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    WhatsApp PDF
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={() => router.push(`/bills/${inv.id}`)}
                    variant="secondary"
                    size="sm"
                    className="text-xs font-bold"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    View
                  </Button>

                  <Button
                    onClick={() => setSelectedInvoice(inv)}
                    variant="success"
                    size="md"
                    className="font-black text-xs h-10 px-4 shadow-sm shadow-emerald-500/20"
                  >
                    <CreditCard className="w-4 h-4 mr-1" />
                    Collect Payment
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Collect Payment Modal */}
      <PaymentCollectorModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
        onPaymentSuccess={loadPendingBills}
      />

      {/* Dynamic UPI QR Modal */}
      <UpiQrModal
        isOpen={!!selectedQrInvoice}
        onClose={() => setSelectedQrInvoice(null)}
        invoice={selectedQrInvoice}
      />

      {/* WhatsApp Share / Cloud API Modal */}
      <WhatsAppShareModal
        isOpen={!!selectedWhatsAppInvoice}
        onClose={() => setSelectedWhatsAppInvoice(null)}
        invoice={selectedWhatsAppInvoice}
      />
    </div>
  );
}
