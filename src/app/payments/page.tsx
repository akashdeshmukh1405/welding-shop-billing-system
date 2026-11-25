"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  History,
  Search,
  Wallet,
  QrCode,
  Building2,
  CreditCard,
  Receipt,
  Download,
  Calendar,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { PaymentMethodBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/common/EmptyState";
import { paymentService } from "@/services/paymentService";
import { PaymentMethod, PaymentRecord } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PaymentsHistoryPage() {
  const router = useRouter();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | "ALL">("ALL");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "THIS_MONTH">("ALL");

  const loadPayments = () => {
    let list = paymentService.getPayments({
      query: searchQuery,
      method: selectedMethod === "ALL" ? undefined : selectedMethod,
    });

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    if (dateFilter === "TODAY") {
      list = list.filter((p) => p.date === todayStr);
    } else if (dateFilter === "THIS_MONTH") {
      list = list.filter((p) => p.date.startsWith(monthStr));
    }

    setPayments(list);
  };

  useEffect(() => {
    loadPayments();
  }, [searchQuery, selectedMethod, dateFilter]);

  const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Totals by payment method
  const cashTotal = payments
    .filter((p) => p.paymentMethod === "CASH")
    .reduce((sum, p) => sum + p.amount, 0);
  const upiTotal = payments
    .filter((p) => p.paymentMethod === "UPI")
    .reduce((sum, p) => sum + p.amount, 0);
  const bankTotal = payments
    .filter((p) => p.paymentMethod === "BANK_TRANSFER")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header & Total Collection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-400" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Payment Collections</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-300">
            Real-time ledger of all advance and settlement payments received
          </p>
        </div>

        <div className="bg-emerald-900/60 border border-emerald-700/50 p-4 rounded-2xl text-left md:text-right flex-shrink-0">
          <p className="text-xs font-bold text-emerald-300 uppercase">Filtered Total Collection</p>
          <p className="text-2xl sm:text-3xl font-black text-white mt-1">
            {formatCurrency(totalCollected)}
          </p>
          <p className="text-[11px] text-emerald-200/80 mt-0.5">{payments.length} Transactions</p>
        </div>
      </div>

      {/* Collection Breakdown by Mode */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-emerald-50/70 border-emerald-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-800 uppercase">Cash Collected</p>
            <p className="text-xl font-black text-emerald-950 mt-1">{formatCurrency(cashTotal)}</p>
          </div>
          <Wallet className="w-8 h-8 text-emerald-600 opacity-70" />
        </Card>

        <Card className="p-4 bg-purple-50/70 border-purple-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-purple-800 uppercase">UPI / QR Collected</p>
            <p className="text-xl font-black text-purple-950 mt-1">{formatCurrency(upiTotal)}</p>
          </div>
          <QrCode className="w-8 h-8 text-purple-600 opacity-70" />
        </Card>

        <Card className="p-4 bg-blue-50/70 border-blue-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-blue-800 uppercase">Bank / IMPS Collected</p>
            <p className="text-xl font-black text-blue-950 mt-1">{formatCurrency(bankTotal)}</p>
          </div>
          <Building2 className="w-8 h-8 text-blue-600 opacity-70" />
        </Card>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search by customer, bill no, note..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center self-start sm:self-auto">
          {/* Date Filter */}
          <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1 text-xs font-bold">
            <button
              onClick={() => setDateFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateFilter === "ALL" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setDateFilter("TODAY")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateFilter === "TODAY" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter("THIS_MONTH")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateFilter === "THIS_MONTH" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              This Month
            </button>
          </div>

          {/* Payment Method Filter */}
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value as any)}
            className="h-10 px-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold cursor-pointer"
          >
            <option value="ALL">All Modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CARD">Card</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {payments.length === 0 ? (
        <EmptyState
          icon={History}
          title="No payment records found"
          description={
            searchQuery
              ? `No transactions match "${searchQuery}"`
              : "No payments recorded for the selected filter."
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-slate-100">
            {payments.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/bills/${p.invoiceId}`)}
                className="p-4 sm:p-5 hover:bg-slate-50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                    ✓
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-base text-slate-900">{p.customerName}</span>
                      <PaymentMethodBadge method={p.paymentMethod} />
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {p.invoiceNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {p.customerPhone} {p.referenceNote ? `• Note: "${p.referenceNote}"` : ""}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <p className="text-lg font-black text-emerald-700">+{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {formatDate(p.date)} {p.time ? `• ${p.time}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
