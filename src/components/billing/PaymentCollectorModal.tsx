"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Invoice, PaymentMethod } from "@/types";
import { formatCurrency, formatDate, getTodayDateString } from "@/lib/utils";
import { paymentService } from "@/services/paymentService";
import { useToast } from "@/context/ToastContext";
import { Wallet, QrCode, Building2, CreditCard, CheckCircle2, IndianRupee } from "lucide-react";

interface PaymentCollectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onPaymentSuccess?: () => void;
}

const METHODS: { id: PaymentMethod; label: string; icon: any }[] = [
  { id: "CASH", label: "Cash", icon: Wallet },
  { id: "UPI", label: "UPI / QR", icon: QrCode },
  { id: "BANK_TRANSFER", label: "Bank Transfer", icon: Building2 },
  { id: "CARD", label: "Card", icon: CreditCard },
];

export function PaymentCollectorModal({
  isOpen,
  onClose,
  invoice,
  onPaymentSuccess,
}: PaymentCollectorModalProps) {
  const toast = useToast();
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [referenceNote, setReferenceNote] = useState("");
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Initialize amount with full pending balance when opened
  React.useEffect(() => {
    if (invoice) {
      setAmount(invoice.pendingAmount);
      setError("");
      setReferenceNote("");
      setPaymentDate(getTodayDateString());
    }
  }, [invoice, isOpen]);

  if (!invoice) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError("Payment amount must be greater than ₹0");
      return;
    }
    if (amount > invoice.pendingAmount) {
      setError(`Amount cannot exceed pending balance of ${formatCurrency(invoice.pendingAmount)}`);
      return;
    }

    setIsSubmitting(true);
    const res = paymentService.collectPayment({
      invoiceId: invoice.id,
      amount,
      paymentMethod,
      referenceNote: referenceNote.trim() || undefined,
      date: paymentDate,
    });

    setIsSubmitting(false);

    if (res.success) {
      toast.success(
        `Collected ${formatCurrency(amount)} for ${invoice.invoiceNumber}. New pending: ${formatCurrency(
          Math.max(0, invoice.pendingAmount - amount)
        )}`
      );
      if (onPaymentSuccess) onPaymentSuccess();
      onClose();
    } else {
      setError(res.error || "Failed to record payment");
      toast.error(res.error || "Payment recording failed");
    }
  };

  const newBalance = Math.max(0, invoice.pendingAmount - (amount || 0));

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" title="Collect Outstanding Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Bill Snapshot Banner */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs sm:text-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-600">Invoice:</span>
            <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-600">Customer:</span>
            <span className="font-bold text-slate-900">{invoice.customerName} ({invoice.customerPhone})</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-600">Total Billed:</span>
            <span className="font-bold text-slate-900">{formatCurrency(invoice.grandTotal)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-600">Already Paid:</span>
            <span className="font-bold text-emerald-600">{formatCurrency(invoice.paidAmount)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-extrabold text-sm">
            <span className="text-rose-700">Pending Due:</span>
            <span className="text-base text-rose-700">{formatCurrency(invoice.pendingAmount)}</span>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-800">
              Payment Amount Being Collected (₹) <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setAmount(invoice.pendingAmount)}
                className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md hover:bg-emerald-200"
              >
                Full Due
              </button>
              <button
                type="button"
                onClick={() => setAmount(Math.round(invoice.pendingAmount / 2))}
                className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200"
              >
                50%
              </button>
            </div>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-lg font-bold text-slate-400">₹</span>
            <input
              type="number"
              min="1"
              max={invoice.pendingAmount}
              value={amount === 0 ? "" : amount}
              onChange={(e) => {
                setAmount(parseFloat(e.target.value) || 0);
                setError("");
              }}
              required
              className="w-full h-12 pl-9 pr-4 text-xl font-black text-emerald-700 bg-white border-2 border-slate-300 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
          </div>
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
        </div>

        {/* Resulting Balance Preview */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs sm:text-sm">
          <span className="text-blue-900 font-semibold">Remaining balance after this payment:</span>
          <span className="font-extrabold text-blue-950 text-base">{formatCurrency(newBalance)}</span>
        </div>

        {/* Payment Method */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Payment Mode</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const isSelected = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date & Reference Note */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Payment Date"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />
          <Input
            label="Reference / Transaction Note"
            placeholder="e.g. GPay UPI ref #983321 or Cash"
            value={referenceNote}
            onChange={(e) => setReferenceNote(e.target.value)}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="success"
            size="lg"
            isLoading={isSubmitting}
            className="font-bold shadow-md shadow-emerald-500/20"
          >
            <CheckCircle2 className="w-5 h-5" />
            Record Payment of {formatCurrency(amount)}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
