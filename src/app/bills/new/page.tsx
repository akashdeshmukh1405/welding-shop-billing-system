"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CustomerSelector } from "@/components/billing/CustomerSelector";
import { ItemRowEditor } from "@/components/billing/ItemRowEditor";
import { CalculationSummary } from "@/components/billing/CalculationSummary";
import { BillSuccessModal } from "@/components/billing/BillSuccessModal";
import { invoiceService } from "@/services/invoiceService";
import { customerService } from "@/services/customerService";
import { storageService } from "@/services/storageService";
import { Invoice, InvoiceItem, PaymentMethod, PaymentStatus } from "@/types";
import { getTodayDateString, isValidIndianMobile } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import { ArrowLeft, CheckCircle2, FileText, PlusCircle, Sparkles } from "lucide-react";

export default function NewBillPage() {
  const router = useRouter();
  const toast = useToast();

  // Next bill number preview
  const [nextBillNumber, setNextBillNumber] = useState<string>("INV-1001");

  // Form State
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerAddress, setCustomerAddress] = useState<string>("");
  const [customerGst, setCustomerGst] = useState<string>("");
  const [linkedFamilyContact, setLinkedFamilyContact] = useState<{ name: string; phone: string; relationship: string } | undefined>();
  const [invoiceDate, setInvoiceDate] = useState<string>(getTodayDateString());
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Items State
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Calculation & Payment State
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("fixed");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [primaryPaymentMethod, setPrimaryPaymentMethod] = useState<PaymentMethod>("CASH");

  // Validation Errors
  const [errors, setErrors] = useState<{
    customerName?: string;
    customerPhone?: string;
    items?: string;
    paidAmount?: string;
  }>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    setNextBillNumber(storageService.getNextInvoiceNumber());

    // Pre-populate with 1 empty item if items list is empty
    const products = storageService.getProducts();
    if (products.length > 0) {
      const defaultProd = products[0];
      setItems([
        {
          id: `item-${Date.now()}`,
          productId: defaultProd.id,
          name: defaultProd.name,
          description: defaultProd.description || "",
          quantity: 1,
          unit: defaultProd.unit,
          unitPrice: defaultProd.defaultPrice,
          total: defaultProd.defaultPrice,
        },
      ]);
    }
  }, []);

  // Compute Subtotal
  const subtotal = items.reduce((sum, it) => sum + (it.total || 0), 0);

  // Compute Discount
  let discountAmount = 0;
  if (discountType === "fixed") {
    discountAmount = Math.min(subtotal, discountValue);
  } else {
    discountAmount = Math.round((subtotal * Math.min(100, discountValue)) / 100);
  }

  // Compute Grand Total
  const grandTotal = Math.max(0, subtotal - discountAmount);

  // Compute Remaining Balance & Status
  const pendingAmount = Math.max(0, grandTotal - paidAmount);
  const status: PaymentStatus =
    paidAmount >= grandTotal && grandTotal > 0
      ? "PAID"
      : paidAmount > 0
      ? "PARTIAL"
      : "PENDING";

  const handleCustomerChange = (data: {
    customerId?: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    customerGst?: string;
    linkedFamilyContact?: { name: string; phone: string; relationship: string };
  }) => {
    setCustomerId(data.customerId);
    setCustomerName(data.customerName);
    setCustomerPhone(data.customerPhone);
    if (data.customerAddress !== undefined) setCustomerAddress(data.customerAddress);
    if (data.customerGst !== undefined) setCustomerGst(data.customerGst);
    setLinkedFamilyContact(data.linkedFamilyContact);

    if (errors.customerName || errors.customerPhone) {
      setErrors((prev) => ({ ...prev, customerName: undefined, customerPhone: undefined }));
    }
  };

  const handleItemsChange = (newItems: InvoiceItem[]) => {
    setItems(newItems);
    if (errors.items) {
      setErrors((prev) => ({ ...prev, items: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errs: typeof errors = {};

    if (!customerName.trim()) {
      errs.customerName = "Customer name is required";
    }

    if (!customerPhone.trim()) {
      errs.customerPhone = "Mobile number is required";
    } else if (!isValidIndianMobile(customerPhone)) {
      errs.customerPhone = "Enter a valid 10-digit Indian mobile number";
    }

    if (items.length === 0) {
      errs.items = "Please add at least one product or service item";
    } else {
      const invalidItem = items.find((it) => !it.name.trim() || it.quantity <= 0);
      if (invalidItem) {
        errs.items = "All items must have a valid name and quantity > 0";
      }
    }

    if (paidAmount > grandTotal) {
      errs.paidAmount = `Paid amount cannot exceed grand total of ₹${grandTotal}`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGenerateBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fill all required fields correctly");
      return;
    }

    setIsSubmitting(true);

    try {
      const invoice = invoiceService.createInvoice({
        customerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
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
        primaryPaymentMethod,
        notes: notes.trim() || undefined,
      });

      // If a linked family contact was added during bill creation, link it now
      if (linkedFamilyContact && invoice.customerId) {
        try {
          customerService.linkFamilyContact(invoice.customerId, linkedFamilyContact);
        } catch {
          // Ignore if already linked
        }
      }

      setIsSubmitting(false);
      setCreatedInvoice(invoice);
      toast.success(`Invoice ${invoice.invoiceNumber} created successfully!`);
    } catch (err: any) {
      setIsSubmitting(false);
      toast.error(err?.message || "Failed to generate bill. Please try again.");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Top Header & Bill No Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            onClick={() => router.back()}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Create New Bill
            </h1>
            <p className="text-xs text-slate-500">
              Welding & Fabrication Job Order
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto bg-blue-50 border border-blue-200 px-4 py-2 rounded-2xl">
          <span className="text-xs font-semibold text-blue-900">Invoice No:</span>
          <span className="font-mono font-black text-blue-700 text-base">{nextBillNumber}</span>
        </div>
      </div>

      {/* Main Billing Form Form */}
      <form onSubmit={handleGenerateBill} className="space-y-6">
        {/* Step 1: Customer Details */}
        <Card>
          <CardHeader className="bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  1
                </span>
                <CardTitle className="text-base sm:text-lg">Customer Information</CardTitle>
              </div>
              <span className="text-xs text-slate-400 font-medium">WhatsApp enabled</span>
            </div>
          </CardHeader>
          <CardContent>
            <CustomerSelector
              customerId={customerId}
              customerName={customerName}
              customerPhone={customerPhone}
              customerAddress={customerAddress}
              customerGst={customerGst}
              linkedFamilyContact={linkedFamilyContact}
              onCustomerChange={handleCustomerChange}
              errors={errors}
            />
          </CardContent>
        </Card>

        {/* Step 2: Invoice Date & Due Date */}
        <Card>
          <CardHeader className="bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </span>
              <CardTitle className="text-base sm:text-lg">Invoice Dates</CardTitle>
            </div>
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
                label="Estimated Delivery / Due Date (Optional)"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                helperText="When fabrication/installation is promised"
              />
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Product / Service Items */}
        <Card>
          <CardHeader className="bg-slate-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  3
                </span>
                <CardTitle className="text-base sm:text-lg">Welding & Fabrication Items</CardTitle>
              </div>
              <span className="text-xs font-bold text-slate-500">
                {items.length} {items.length === 1 ? "Item" : "Items"}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <ItemRowEditor
              items={items}
              onChange={handleItemsChange}
              error={errors.items}
            />
          </CardContent>
        </Card>

        {/* Step 4: Calculations & Advance Payment */}
        <Card>
          <CardHeader className="bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                4
              </span>
              <CardTitle className="text-base sm:text-lg">Billing & Advance Payment</CardTitle>
            </div>
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
              onPaidAmountChange={(amt) => {
                setPaidAmount(amt);
                if (errors.paidAmount) setErrors((prev) => ({ ...prev, paidAmount: undefined }));
              }}
              onPaymentMethodChange={setPrimaryPaymentMethod}
              onNotesChange={setNotes}
              errors={errors}
            />
          </CardContent>
        </Card>

        {/* Sticky Tablet Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-300 p-4 sm:px-8 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Grand Total</p>
              <p className="text-xl sm:text-2xl font-black text-slate-900">₹{grandTotal.toLocaleString("en-IN")}</p>
            </div>
            <div className="hidden sm:block border-l border-slate-300 pl-4">
              <p className="text-xs font-bold text-slate-400 uppercase">Pending Due</p>
              <p className={`text-lg font-extrabold ${pendingAmount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                ₹{pendingAmount.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => router.push("/")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="xl"
              isLoading={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-lg shadow-emerald-600/30 px-6 sm:px-10"
            >
              <CheckCircle2 className="w-6 h-6" />
              <span>Generate Bill</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Post-Creation Success Modal with Confetti, Print & WhatsApp */}
      <BillSuccessModal
        isOpen={!!createdInvoice}
        onClose={() => setCreatedInvoice(null)}
        invoice={createdInvoice}
      />
    </div>
  );
}
