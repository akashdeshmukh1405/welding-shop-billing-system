import { PaymentMethod, PaymentRecord } from "../types";
import { storageService } from "./storageService";
import { getTodayDateString } from "../lib/utils";

class PaymentService {
  public getPayments(filters?: {
    startDate?: string;
    endDate?: string;
    method?: PaymentMethod;
    query?: string;
  }): PaymentRecord[] {
    let payments = storageService.getPayments();

    if (!filters) {
      return payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    if (filters.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      payments = payments.filter(
        (p) =>
          p.invoiceNumber.toLowerCase().includes(q) ||
          p.customerName.toLowerCase().includes(q) ||
          p.customerPhone.includes(q) ||
          (p.referenceNote && p.referenceNote.toLowerCase().includes(q))
      );
    }

    if (filters.method) {
      payments = payments.filter((p) => p.paymentMethod === filters.method);
    }

    if (filters.startDate) {
      payments = payments.filter((p) => p.date >= filters.startDate!);
    }

    if (filters.endDate) {
      payments = payments.filter((p) => p.date <= filters.endDate!);
    }

    return payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public collectPayment(data: {
    invoiceId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNote?: string;
    date?: string;
  }): { success: boolean; error?: string; payment?: PaymentRecord } {
    const invoices = storageService.getInvoices();
    const invoiceIndex = invoices.findIndex((inv) => inv.id === data.invoiceId);

    if (invoiceIndex === -1) {
      return { success: false, error: "Invoice not found" };
    }

    const invoice = invoices[invoiceIndex];
    if (data.amount <= 0) {
      return { success: false, error: "Payment amount must be greater than ₹0" };
    }

    if (data.amount > invoice.pendingAmount + 0.001) {
      return {
        success: false,
        error: `Payment amount (₹${data.amount}) cannot exceed pending amount (₹${invoice.pendingAmount})`,
      };
    }

    const paymentDate = data.date || getTodayDateString();
    const nowIso = new Date().toISOString();

    // Prevent accidental duplicate payment submission within 5 seconds
    const existingPayments = invoice.payments || [];
    const isDuplicate = existingPayments.some((p) => {
      const isSameAmount = Math.abs(p.amount - data.amount) < 0.01;
      const isSameDate = p.date === paymentDate;
      const isRecent = Math.abs(new Date().getTime() - new Date(p.createdAt).getTime()) < 5000;
      return isSameAmount && isSameDate && isRecent;
    });

    if (isDuplicate) {
      return { success: false, error: "Duplicate payment detected. Payment was already recorded." };
    }

    const paymentId = `pay-${invoice.id}-${Date.now()}`;

    const newPayment: PaymentRecord = {
      id: paymentId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      amount: Math.round(data.amount * 100) / 100,
      paymentMethod: data.paymentMethod,
      referenceNote: data.referenceNote,
      date: paymentDate,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      createdAt: nowIso,
    };

    // Update Invoice with precise rounding
    const newPaidAmount = Math.round((invoice.paidAmount + data.amount) * 100) / 100;
    const newPendingAmount = Math.max(0, Math.round((invoice.grandTotal - newPaidAmount) * 100) / 100);
    const newStatus = newPendingAmount === 0 ? 'PAID' : 'PARTIAL';

    const updatedInvoice = {
      ...invoice,
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
      status: newStatus as any,
      payments: [...(invoice.payments || []), newPayment],
      updatedAt: nowIso,
    };

    invoices[invoiceIndex] = updatedInvoice;
    storageService.saveInvoices(invoices);

    // Save to global payments ledger
    const allPayments = storageService.getPayments();
    allPayments.unshift(newPayment);
    storageService.savePayments(allPayments);

    // Update customer stats
    storageService.recalculateCustomerStats(invoice.customerId);

    return { success: true, payment: newPayment };
  }
}

export const paymentService = new PaymentService();
