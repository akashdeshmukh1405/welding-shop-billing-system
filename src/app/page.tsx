"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Clock,
  Wallet,
  CheckCircle2,
  Receipt,
  ArrowRight,
  CreditCard,
  Phone,
  AlertCircle,
  Download,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { PaymentCollectorModal } from "@/components/billing/PaymentCollectorModal";
import { storageService } from "@/services/storageService";
import { invoiceService } from "@/services/invoiceService";
import { DashboardStats, Invoice, ShopSettings } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [greeting, setGreeting] = useState("Good Morning");

  const loadDashboardData = () => {
    const s = invoiceService.getDashboardStats();
    setStats(s);

    const shop = storageService.getSettings();
    setSettings(shop);

    const all = storageService.getInvoices();
    const sortedPending = all
      .filter((i) => i.pendingAmount > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Show maximum 5 latest pending bills
    setPendingInvoices(sortedPending.slice(0, 5));

    // Calculate greeting
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 17) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  };

  useEffect(() => {
    loadDashboardData();
    window.addEventListener("storage", loadDashboardData);
    return () => window.removeEventListener("storage", loadDashboardData);
  }, []);

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. TOP GREETING & SHOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-4">
        <div>
          <p className="text-xs sm:text-sm font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
            <span>{settings?.headerTradition || "|| Shree ||"}</span>
            <span>•</span>
            <span>{greeting}</span>
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              {settings?.shopName || "JAI MATA DI"}
            </h1>
            <span className="text-xs sm:text-sm font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg uppercase">
              {settings?.businessCategory || "STEEL FURNITURE & RAILING"}
            </span>
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs sm:text-sm font-semibold text-slate-500">{todayFormatted}</p>
        </div>
      </div>

      {/* 2. HUGE PRIMARY ACTION BUTTON — + CREATE NEW BILL */}
      <div>
        <button
          onClick={() => router.push("/bills/new")}
          className="w-full group bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-xl shadow-blue-500/25 transition-all transform active:scale-[0.99] flex items-center justify-between gap-4 border border-blue-400/30"
        >
          <div className="flex items-center gap-4 sm:gap-6 text-left">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <PlusCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-blue-100/90 block">
                Billing Counter
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                + CREATE NEW BILL
              </h2>
              <p className="text-xs sm:text-sm font-medium text-blue-100/80 mt-0.5 hidden sm:block">
                Click here to start a new bill for gate, grill, railing, or repair work
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-md text-white font-bold text-sm border border-white/20">
            <span>Start</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* 3. MAIN 4 DASHBOARD METRIC CARDS (Glassmorphism UI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* CARD 1: PENDING PAYMENTS (Most Prominent Financial Stat) */}
        <div
          onClick={() => router.push("/pending")}
          className="group cursor-pointer bg-gradient-to-br from-rose-50/90 via-white/80 to-rose-50/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-6 border-2 border-rose-200/80 shadow-lg shadow-rose-500/5 hover:shadow-xl hover:shadow-rose-500/10 hover:border-rose-400 transition-all flex flex-col justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-500" />
                Pending Payments
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-xs">
                {stats?.pendingBillsCount || 0} Bills
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-rose-700 tracking-tight pt-2">
              {formatCurrency(stats?.totalOutstanding || 0)}
            </p>
            <p className="text-xs font-semibold text-slate-500">Total amount to be collected</p>
          </div>

          <div className="pt-4 mt-2 border-t border-rose-100 flex items-center justify-between text-xs font-bold text-rose-700 group-hover:text-rose-900">
            <span>View Pending Bills</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 2: TODAY'S COLLECTION */}
        <div
          onClick={() => router.push("/payments")}
          className="group cursor-pointer bg-gradient-to-br from-emerald-50/90 via-white/80 to-emerald-50/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-emerald-200/80 shadow-md shadow-emerald-500/5 hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-400 transition-all flex flex-col justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-600" />
                Today&apos;s Collection
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight pt-2">
              {formatCurrency(stats?.todayCollections || 0)}
            </p>
            <p className="text-xs font-semibold text-slate-500">Money received today</p>
          </div>

          <div className="pt-4 mt-2 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:text-emerald-900">
            <span>View Payment History</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 3: COMPLETED BILLS */}
        <div
          onClick={() => router.push("/bills?tab=PAID")}
          className="group cursor-pointer bg-gradient-to-br from-blue-50/90 via-white/80 to-blue-50/40 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-blue-200/80 shadow-md shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 hover:border-blue-400 transition-all flex flex-col justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Completed Bills
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-blue-900 tracking-tight pt-2">
              {stats?.paidBillsCount || 0} <span className="text-lg font-bold text-slate-500">Bills</span>
            </p>
            <p className="text-xs font-semibold text-slate-500">Fully paid bills</p>
          </div>

          <div className="pt-4 mt-2 border-t border-blue-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:text-blue-900">
            <span>View Completed</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 4: TOTAL BILLS (Secondary) */}
        <div
          onClick={() => router.push("/bills")}
          className="group cursor-pointer bg-white/75 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-slate-400" />
                Total Bills
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight pt-2">
              {stats?.totalBillsCount || 0} <span className="text-lg font-bold text-slate-400">Bills</span>
            </p>
            <p className="text-xs font-semibold text-slate-400">All generated bills</p>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-600 group-hover:text-slate-900">
            <span>View All Bills</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* 4. PENDING BILLS SPOTLIGHT SECTION (Max 5 latest pending bills) */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Pending Payments
              </h2>
              {stats?.pendingBillsCount ? (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-black">
                  {stats.pendingBillsCount} Due
                </span>
              ) : null}
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5">
              Customers who still have an amount to pay
            </p>
          </div>

          {pendingInvoices.length > 0 && (
            <Button
              onClick={() => router.push("/pending")}
              variant="outline"
              size="sm"
              className="text-xs font-bold self-start sm:self-auto border-slate-300"
            >
              View All Pending ({stats?.pendingBillsCount || 0})
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
        </div>

        {/* Pending Bills Card List */}
        {pendingInvoices.length === 0 ? (
          /* Friendly Empty State */
          <div className="bg-gradient-to-br from-emerald-50/80 via-white/80 to-emerald-50/40 backdrop-blur-xl border border-emerald-200/80 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-black text-slate-900">No pending payments</h3>
            <p className="text-sm font-semibold text-slate-500 mt-1 max-w-md mx-auto">
              All customer payments are complete. All customer accounts are settled in full.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingInvoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => router.push(`/bills/${inv.id}`)}
                className="group cursor-pointer bg-white/85 backdrop-blur-xl border-2 border-rose-100/90 hover:border-rose-300 rounded-2xl sm:rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Customer Info & Pending Balance */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                        {inv.customerName}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                        <span className="font-mono font-bold text-slate-700">{inv.invoiceNumber}</span>
                        <span>•</span>
                        <Phone className="w-3 h-3 text-slate-400 inline" />
                        <span>{inv.customerPhone}</span>
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xl sm:text-2xl font-black text-rose-600">
                        {formatCurrency(inv.pendingAmount)}
                      </p>
                      <p className="text-[11px] font-black uppercase text-rose-500 tracking-wider">
                        Pending
                      </p>
                    </div>
                  </div>

                  {/* Financial Breakdown Table Chips */}
                  <div className="mt-3.5 p-3 rounded-xl bg-slate-50/80 border border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Total</span>
                      <span className="font-black text-slate-900">{formatCurrency(inv.grandTotal)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Paid</span>
                      <span className="font-black text-emerald-700">{formatCurrency(inv.paidAmount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">Status</span>
                      <span className="inline-block mt-0.5">
                        <PaymentStatusBadge status={inv.status} size="sm" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Collect Payment Action */}
                <div
                  className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-xs text-slate-400 font-medium truncate">
                    Date: {formatDate(inv.date)}
                  </span>

                  <Button
                    onClick={() => setSelectedInvoiceForPayment(inv)}
                    variant="success"
                    size="md"
                    className="font-black text-xs sm:text-sm h-11 px-5 shadow-md shadow-emerald-500/20"
                  >
                    <CreditCard className="w-4 h-4" />
                    Collect {formatCurrency(inv.pendingAmount)}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Link to Full Pending Payments Page */}
        {pendingInvoices.length > 0 && (
          <div className="text-center pt-2">
            <Button
              onClick={() => router.push("/pending")}
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto font-bold text-sm bg-white/90 border border-slate-300 hover:bg-slate-50 text-slate-800 shadow-sm"
            >
              VIEW ALL PENDING BILLS ({stats?.pendingBillsCount || 0}) →
            </Button>
          </div>
        )}
      </div>

      {/* 5. QUICK COMPLETED BILLS BANNER */}
      <div className="bg-white/70 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-black text-slate-900 text-sm sm:text-base">
              Completed Bills ({stats?.paidBillsCount || 0})
            </h4>
            <p className="text-xs text-slate-500">View all settled and fully paid invoices</p>
          </div>
        </div>

        <Button
          onClick={() => router.push("/bills?tab=PAID")}
          variant="outline"
          size="sm"
          className="text-xs font-bold border-slate-300 text-slate-700 self-start sm:self-auto"
        >
          View Completed Bills →
        </Button>
      </div>

      {/* Payment Collector Modal */}
      <PaymentCollectorModal
        isOpen={!!selectedInvoiceForPayment}
        onClose={() => setSelectedInvoiceForPayment(null)}
        invoice={selectedInvoiceForPayment}
        onPaymentSuccess={loadDashboardData}
      />
    </div>
  );
}
