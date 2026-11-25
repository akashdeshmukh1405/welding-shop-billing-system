"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  Wallet,
  Clock,
  Receipt,
  Printer,
  Download,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { storageService } from "@/services/storageService";
import { Invoice, PaymentRecord, ShopSettings } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const [period, setPeriod] = useState<"TODAY" | "WEEK" | "MONTH" | "YEAR" | "CUSTOM">("MONTH");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [settings, setSettings] = useState<ShopSettings>(storageService.getSettings());

  useEffect(() => {
    setSettings(storageService.getSettings());

    const allInvoices = storageService.getInvoices();
    const allPayments = storageService.getPayments();

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
      now.getDate()
    ).padStart(2, "0")}`;
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const yearStr = `${now.getFullYear()}`;

    // 7 days ago
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];

    let filteredInvoices = allInvoices;
    let filteredPayments = allPayments;

    if (period === "TODAY") {
      filteredInvoices = allInvoices.filter((i) => i.date === todayStr);
      filteredPayments = allPayments.filter((p) => p.date === todayStr);
    } else if (period === "WEEK") {
      filteredInvoices = allInvoices.filter((i) => i.date >= weekAgoStr);
      filteredPayments = allPayments.filter((p) => p.date >= weekAgoStr);
    } else if (period === "MONTH") {
      filteredInvoices = allInvoices.filter((i) => i.date.startsWith(monthStr));
      filteredPayments = allPayments.filter((p) => p.date.startsWith(monthStr));
    } else if (period === "YEAR") {
      filteredInvoices = allInvoices.filter((i) => i.date.startsWith(yearStr));
      filteredPayments = allPayments.filter((p) => p.date.startsWith(yearStr));
    } else if (period === "CUSTOM" && startDate && endDate) {
      filteredInvoices = allInvoices.filter((i) => i.date >= startDate && i.date <= endDate);
      filteredPayments = allPayments.filter((p) => p.date >= startDate && p.date <= endDate);
    }

    setInvoices(filteredInvoices);
    setPayments(filteredPayments);
  }, [period, startDate, endDate]);

  const totalSales = invoices.reduce((sum, i) => sum + i.grandTotal, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = invoices.reduce((sum, i) => sum + i.pendingAmount, 0);

  const cashAmount = payments
    .filter((p) => p.paymentMethod === "CASH")
    .reduce((sum, p) => sum + p.amount, 0);
  const upiAmount = payments
    .filter((p) => p.paymentMethod === "UPI")
    .reduce((sum, p) => sum + p.amount, 0);
  const bankAmount = payments
    .filter((p) => p.paymentMethod === "BANK_TRANSFER")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Sales & Collection Reports
          </h1>
          <p className="text-xs text-slate-500">
            Performance analytics, revenue streams, and collection audit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
            variant="primary"
            size="md"
            className="bg-slate-900 hover:bg-slate-800"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Period Filter Bar */}
      <div className="no-print flex flex-wrap gap-2 items-center justify-between p-3 bg-white rounded-2xl border border-slate-200">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "TODAY", label: "Today" },
              { id: "WEEK", label: "Last 7 Days" },
              { id: "MONTH", label: "This Month" },
              { id: "YEAR", label: "This Year" },
              { id: "CUSTOM", label: "Custom Range" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                period === t.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {period === "CUSTOM" && (
          <div className="flex items-center gap-2 pt-2 sm:pt-0">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 text-xs"
            />
            <span className="text-xs text-slate-400 font-bold">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        )}
      </div>

      {/* Printable Report Header */}
      <div className="print-only hidden p-4 mb-4 border-b-2 border-slate-800">
        <h2 className="text-xl font-bold">{settings.shopName}</h2>
        <p className="text-xs">{settings.shopAddress} • Ph: {settings.shopPhone}</p>
        <p className="text-sm font-bold mt-2">
          SALES & COLLECTION REPORT ({period})
        </p>
      </div>

      {/* Summary Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-blue-50/70 border-blue-200">
          <p className="text-xs font-bold text-blue-800 uppercase">Total Sales</p>
          <p className="text-2xl font-black text-blue-950 mt-1">{formatCurrency(totalSales)}</p>
          <p className="text-xs text-blue-700 mt-1">{invoices.length} Bills Generated</p>
        </Card>

        <Card className="p-5 bg-emerald-50/70 border-emerald-200">
          <p className="text-xs font-bold text-emerald-800 uppercase">Total Collected</p>
          <p className="text-2xl font-black text-emerald-950 mt-1">{formatCurrency(totalCollected)}</p>
          <p className="text-xs text-emerald-700 mt-1">{payments.length} Payments</p>
        </Card>

        <Card className="p-5 bg-rose-50/70 border-rose-200">
          <p className="text-xs font-bold text-rose-800 uppercase">Total Outstanding</p>
          <p className="text-2xl font-black text-rose-950 mt-1">{formatCurrency(totalPending)}</p>
          <p className="text-xs text-rose-700 mt-1">Pending from customers</p>
        </Card>

        <Card className="p-5 bg-purple-50/70 border-purple-200">
          <p className="text-xs font-bold text-purple-800 uppercase">Collection Rate</p>
          <p className="text-2xl font-black text-purple-950 mt-1">
            {totalSales > 0 ? `${Math.round((totalCollected / totalSales) * 100)}%` : "100%"}
          </p>
          <p className="text-xs text-purple-700 mt-1">Collected vs Total</p>
        </Card>
      </div>

      {/* Payment Method Breakdown Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Collections Breakdown by Payment Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
              <p className="text-xs font-bold text-emerald-800 uppercase">Cash</p>
              <p className="text-xl font-black text-emerald-950 mt-1">{formatCurrency(cashAmount)}</p>
              <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                {totalCollected > 0 ? Math.round((cashAmount / totalCollected) * 100) : 0}% of collections
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-center">
              <p className="text-xs font-bold text-purple-800 uppercase">UPI / QR</p>
              <p className="text-xl font-black text-purple-950 mt-1">{formatCurrency(upiAmount)}</p>
              <p className="text-xs text-purple-700 mt-0.5 font-medium">
                {totalCollected > 0 ? Math.round((upiAmount / totalCollected) * 100) : 0}% of collections
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-center">
              <p className="text-xs font-bold text-blue-800 uppercase">Bank Transfer / IMPS</p>
              <p className="text-xl font-black text-blue-950 mt-1">{formatCurrency(bankAmount)}</p>
              <p className="text-xs text-blue-700 mt-0.5 font-medium">
                {totalCollected > 0 ? Math.round((bankAmount / totalCollected) * 100) : 0}% of collections
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices in this Period Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices in Selected Period ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[11px]">
                <th className="p-3">Bill No</th>
                <th className="p-3">Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3 text-right">Grand Total</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3 text-right">Pending</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold font-mono text-slate-900">{inv.invoiceNumber}</td>
                  <td className="p-3 text-slate-600">{formatDate(inv.date)}</td>
                  <td className="p-3 font-semibold text-slate-800">
                    {inv.customerName} ({inv.customerPhone})
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(inv.grandTotal)}</td>
                  <td className="p-3 text-right text-emerald-700 font-bold">{formatCurrency(inv.paidAmount)}</td>
                  <td className="p-3 text-right text-rose-700 font-bold">{formatCurrency(inv.pendingAmount)}</td>
                  <td className="p-3 text-center">
                    <span className="font-bold text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {inv.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
