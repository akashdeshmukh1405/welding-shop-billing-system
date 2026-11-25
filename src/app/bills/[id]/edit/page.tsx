"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CustomerSelector } from "@/components/billing/CustomerSelector";
import { ItemRowEditor } from "@/components/billing/ItemRowEditor";
import { CalculationSummary } from "@/components/billing/CalculationSummary";
import { invoiceService } from "@/services/invoiceService";
import { Invoice, InvoiceItem, PaymentMethod, PaymentStatus } from "@/types";
import { useToast } from "@/context/ToastContext";
import { ArrowLeft, Save } from "lucide-react";
import { isValidIndianMobile } from "@/lib/utils";

export default function EditBillPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGst, setCustomerGst] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [primaryPaymentMethod, setPrimaryPaymentMethod] = useState<PaymentMethod>("CASH");

  const [errors, setErrors] = useState<{
    customerName?: string;
    customerPhone?: string;
    items?: string;
    paidAmount?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const inv = invoiceService.getInvoiceById(id);
    if (!inv) {
      toast.error("Invoice not found");
      router.push("/bills");
      return;
    }

    setInvoiceNumber(inv.invoiceNumber);
    setCustomerId(inv.customerId);
    setCustomerName(inv.customerName);
    setCustomerPhone(inv.customerPhone);
    setCustomerAddress(inv.customerAddress || "");
    setCustomerGst(inv.customerGst || "");
    setInvoiceDate(inv.date);
    setDueDate(inv.dueDate || "");
    setNotes(inv.notes || "");
    setItems(inv.items);
    setDiscountType(inv.discountType || "fixed");
    setDiscountValue(inv.discountValue || 0);
    setPaidAmount(inv.paidAmount);
    setPrimaryPaymentMethod(inv.primaryPaymentMethod || "CASH");
    setLoading(false);
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading invoice data...</div>;
  }

  // Math
  const subtotal = items.reduce((sum, it) => sum + (it.total || 0), 0);
  let discountAmount = 0;
  if (discountType === "fixed") {
    discountAmount = Math.min(subtotal, discountValue);
  } else {
    discountAmount = Math.round((subtotal * Math.min(100, discountValue)) / 100);
  }
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const pendingAmount = Math.max(0, grandTotal - paidAmount);
  const status: PaymentStatus =
    paidAmount >= grandTotal && grandTotal > 0
      ? "PAID"
      : paidAmount > 0
      ? "PARTIAL"
      : "PENDING";

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!isValidIndianMobile(customerPhone)) {
      toast.error("Valid 10-digit mobile number is required");
      return;
    }
    if (items.length === 0) {
      toast.error("At least one item is required");
      return;
    }

    setIsSubmitting(true);
    const updated = invoiceService.updateInvoice(id, {
      customerName,
      customerPhone,
      customerAddress: customerAddress.trim() || undefined,
      customerGst: customerGst.trim() || undefined,
      date: invoiceDate,
      dueDate: dueDate || undefined,
      items,
      subtotal,
      discountType,
      discountValue,
      discountAmount,
      grandTotal,
      paidAmount,
      pendingAmount,
      status,
      primaryPaymentMethod,
      notes: notes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (updated) {
      toast.success(`Invoice ${invoiceNumber} updated successfully`);
      router.push(`/bills/${id}`);
    } else {
      toast.error("Failed to update invoice");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Edit Invoice: {invoiceNumber}
            </h1>
            <p className="text-xs text-slate-500">Update bill details and items</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Customer */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerSelector
              customerName={customerName}
              customerPhone={customerPhone}
              customerAddress={customerAddress}
              customerGst={customerGst}
              onCustomerChange={(data) => {
                setCustomerName(data.customerName);
                setCustomerPhone(data.customerPhone);
                if (data.customerAddress !== undefined) setCustomerAddress(data.customerAddress);
                if (data.customerGst !== undefined) setCustomerGst(data.customerGst);
              }}
              errors={errors}
            />
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Invoice Date"
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
              <Input
                label="Due / Delivery Date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card>
          <CardHeader>
            <CardTitle>Items & Services</CardTitle>
          </CardHeader>
          <CardContent>
            <ItemRowEditor items={items} onChange={setItems} error={errors.items} />
          </CardContent>
        </Card>

        {/* Calculations */}
        <Card>
          <CardHeader>
            <CardTitle>Payment & Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <CalculationSummary
              subtotal={subtotal}
              discountType={discountType}
              discountValue={discountValue}
              discountAmount={discountAmount}
              grandTotal={grandTotal}
              paidAmount={paidAmount}
              pendingAmount={pendingAmount}
              status={status}
              primaryPaymentMethod={primaryPaymentMethod}
              notes={notes}
              onDiscountTypeChange={setDiscountType}
              onDiscountValueChange={setDiscountValue}
              onPaidAmountChange={setPaidAmount}
              onPaymentMethodChange={setPrimaryPaymentMethod}
              onNotesChange={setNotes}
              errors={errors}
            />
          </CardContent>
        </Card>

        {/* Sticky Save Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-300 p-4 sm:px-8 shadow-2xl flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-slate-400">Total</p>
            <p className="text-xl font-black text-slate-900">₹{grandTotal.toLocaleString("en-IN")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button type="button" variant="secondary" size="lg" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="xl" isLoading={isSubmitting} className="font-bold">
              <Save className="w-5 h-5" />
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
