"use client";

import React, { useState, useEffect } from "react";
import { PaymentMethod, PaymentStatus } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { CreditCard, Wallet, QrCode, Building2, HelpCircle, CheckCircle2, Clock, Banknote } from "lucide-react";

interface CalculationSummaryProps {
  subtotal: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  pendingAmount: number;
  status: PaymentStatus;
  primaryPaymentMethod: PaymentMethod;
  notes?: string;
  onDiscountTypeChange: (type: "percentage" | "fixed") => void;
  onDiscountValueChange: (val: number) => void;
  onPaidAmountChange: (paid: number) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onNotesChange: (notes: string) => void;
  errors?: {
    paidAmount?: string;
  };
}

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: any }[] = [
  { id: "CASH", label: "Cash", icon: Wallet },
  { id: "UPI", label: "UPI / QR", icon: QrCode },
  { id: "BANK_TRANSFER", label: "Bank (NEFT/IMPS)", icon: Building2 },
  { id: "CARD", label: "Card / POS", icon: CreditCard },
  { id: "OTHER", label: "Other", icon: HelpCircle },
];

export function CalculationSummary({
  subtotal,
  discountType,
  discountValue,
  discountAmount,
  grandTotal,
  paidAmount,
  pendingAmount,
  status,
  primaryPaymentMethod,
  notes,
  onDiscountTypeChange,
  onDiscountValueChange,
  onPaidAmountChange,
  onPaymentMethodChange,
  onNotesChange,
  errors,
}: CalculationSummaryProps) {
  // Payment Mode Selection: 'PAY_NOW' vs 'KEEP_PENDING'
  const [paymentChoice, setPaymentChoice] = useState<"PAY_NOW" | "KEEP_PENDING">(
    paidAmount >= grandTotal && grandTotal > 0 ? "PAY_NOW" : "KEEP_PENDING"
  );

  // Sync choice if external paidAmount changes
  useEffect(() => {
    if (paidAmount === grandTotal && grandTotal > 0) {
      setPaymentChoice("PAY_NOW");
    }
  }, [grandTotal]);

  const handleSelectPayNow = () => {
    setPaymentChoice("PAY_NOW");
    onPaidAmountChange(grandTotal);
  };

  const handleSelectKeepPending = () => {
    setPaymentChoice("KEEP_PENDING");
    // If it was full pay now, default to 0 (or keep existing partial if <= grandTotal)
    if (paidAmount >= grandTotal) {
      onPaidAmountChange(0);
    }
  };

  const handleQuickAdvance = (amount: number) => {
    setPaymentChoice("KEEP_PENDING");
    onPaidAmountChange(amount);
  };

  return (
    <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
        <h4 className="font-extrabold text-slate-900 text-base">Payment & Billing Summary</h4>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Calculated Status:</span>
          <PaymentStatusBadge status={status} size="md" />
        </div>
      </div>

      {/* Financial Math Breakdown */}
      <div className="space-y-3 text-sm">
        {/* Subtotal */}
        <div className="flex items-center justify-between font-semibold text-slate-700">
          <span>Subtotal</span>
          <span className="text-base text-slate-900">{formatCurrency(subtotal)}</span>
        </div>

        {/* Discount Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Discount</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs">
              <button
                type="button"
                onClick={() => onDiscountTypeChange("fixed")}
                className={`px-2 py-0.5 rounded font-bold transition-colors ${
                  discountType === "fixed" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                ₹ Fixed
              </button>
              <button
                type="button"
                onClick={() => onDiscountTypeChange("percentage")}
                className={`px-2 py-0.5 rounded font-bold transition-colors ${
                  discountType === "percentage" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                % Percent
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <div className="w-28 relative">
              <input
                type="number"
                min="0"
                placeholder="0"
                value={discountValue === 0 ? "" : discountValue}
                onChange={(e) => onDiscountValueChange(parseFloat(e.target.value) || 0)}
                className="w-full h-9 px-3 text-right font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">
                {discountType === "fixed" ? "₹" : "%"}
              </span>
            </div>
            {discountAmount > 0 && (
              <span className="font-bold text-emerald-600 text-sm">-{formatCurrency(discountAmount)}</span>
            )}
          </div>
        </div>

        {/* Grand Total */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-slate-300 font-extrabold text-lg text-slate-900">
          <span>Grand Total</span>
          <span className="text-2xl text-blue-700">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* --- Section 1: "How is the customer paying?" --- */}
      <div className="pt-4 border-t-2 border-slate-200 space-y-4">
        <div>
          <label className="block text-sm font-extrabold text-slate-900 mb-1">
            How is the customer paying? <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500">Choose whether full payment is received now or kept pending</p>
        </div>

        {/* Two Large Touch Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* OPTION 1: PAY NOW */}
          <button
            type="button"
            onClick={handleSelectPayNow}
            className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex flex-col justify-between gap-3 ${
              paymentChoice === "PAY_NOW"
                ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                : "bg-white border-slate-300 hover:border-slate-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    paymentChoice === "PAY_NOW" ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-400 bg-white"
                  }`}
                >
                  {paymentChoice === "PAY_NOW" && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
                <span className="font-black text-base text-slate-900">PAY NOW</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Full Paid
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Customer pays complete bill amount ({formatCurrency(grandTotal)}) immediately.
            </p>
          </button>

          {/* OPTION 2: KEEP PENDING */}
          <button
            type="button"
            onClick={handleSelectKeepPending}
            className={`p-4 rounded-2xl border-2 text-left transition-all active:scale-[0.99] flex flex-col justify-between gap-3 ${
              paymentChoice === "KEEP_PENDING"
                ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-500/20 shadow-md"
                : "bg-white border-slate-300 hover:border-slate-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    paymentChoice === "KEEP_PENDING" ? "border-amber-600 bg-amber-600 text-white" : "border-slate-400 bg-white"
                  }`}
                >
                  {paymentChoice === "KEEP_PENDING" && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
                </div>
                <span className="font-black text-base text-slate-900">KEEP PENDING / ADVANCE</span>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                Pay Later
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Customer pays partial advance or keeps full amount pending for later.
            </p>
          </button>
        </div>

        {/* When KEEP PENDING is active: Show Advance Payment Controls */}
        {paymentChoice === "KEEP_PENDING" && (
          <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-sm space-y-3 animate-in fade-in duration-150">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-sm font-bold text-slate-800">
                Advance Amount Received (if any)
              </label>

              {/* Quick Advance Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleQuickAdvance(0)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                    paidAmount === 0 ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  ₹0 (Full Pending)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdvance(Math.round(grandTotal * 0.25))}
                  className="px-2.5 py-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors"
                >
                  25% (₹{Math.round(grandTotal * 0.25)})
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAdvance(Math.round(grandTotal * 0.5))}
                  className="px-2.5 py-1 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg transition-colors"
                >
                  50% (₹{Math.round(grandTotal * 0.5)})
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-3 text-lg font-bold text-slate-400">₹</span>
              <input
                type="number"
                min="0"
                max={grandTotal}
                placeholder="0"
                value={paidAmount === 0 ? "" : paidAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  onPaidAmountChange(Math.min(grandTotal, Math.max(0, val)));
                }}
                className="w-full h-12 pl-9 pr-4 text-xl font-extrabold text-slate-900 bg-slate-50 border-2 border-slate-300 focus:border-amber-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>
            {errors?.paidAmount && (
              <p className="text-xs font-bold text-red-600">{errors.paidAmount}</p>
            )}
          </div>
        )}

        {/* Live Balance & Status Summary Banner */}
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            pendingAmount > 0
              ? "bg-rose-50 border-rose-200 text-rose-950"
              : "bg-emerald-50 border-emerald-200 text-emerald-950"
          }`}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Remaining Balance</p>
            <p className="text-xl font-black mt-0.5">{formatCurrency(pendingAmount)}</p>
          </div>
          <div className="text-right">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                pendingAmount > 0 ? "bg-rose-200 text-rose-800" : "bg-emerald-200 text-emerald-800"
              }`}
            >
              {pendingAmount > 0 ? "PAYMENT DUE (Pending)" : "FULLY PAID"}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Method Selector (Only when amount paid > 0) */}
      {paidAmount > 0 && (
        <div className="pt-2 space-y-2">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
            Payment Mode (Received Via)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {PAYMENT_METHODS.map((pm) => {
              const Icon = pm.icon;
              const isSelected = primaryPaymentMethod === pm.id;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => onPaymentMethodChange(pm.id)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1.5" />
                  <span>{pm.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes / Special Instructions */}
      <div className="pt-2 space-y-1">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
          Invoice Notes / Delivery Remarks
        </label>
        <textarea
          rows={2}
          value={notes || ""}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="e.g. Delivery scheduled for 10th Sep. Balance on installation."
          className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
        />
      </div>
    </div>
  );
}
