import { DashboardStats, Invoice, InvoiceFilterParams, PaymentRecord, PaymentStatus } from "../types";
import { storageService } from "./storageService";
import { customerService } from "./customerService";
import { getTodayDateString } from "../lib/utils";

export interface CreateInvoiceInput {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerGst?: string;
  date: string;
  dueDate?: string;
  items: Array<{
    id?: string;
    productId?: string;
    name: string;
    description?: string;
    quantity: number;
    unit: any;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  grandTotal: number;
  paidAmount: number;
  pendingAmount: number;
  primaryPaymentMethod: any;
  notes?: string;
}

class InvoiceService {
  public calculatePaymentStatus(total: number, paid: number): PaymentStatus {
    if (paid >= total && total > 0) return 'PAID';
    if (paid > 0 && paid < total) return 'PARTIAL';
    return 'PENDING';
  }

  public getInvoices(filters?: InvoiceFilterParams): Invoice[] {
    let invoices = storageService.getInvoices();

    if (!filters) return invoices;

    if (filters.query && filters.query.trim()) {
      const q = filters.query.toLowerCase().trim();
      invoices = invoices.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          inv.customerPhone.includes(q)
      );
    }

    if (filters.status && filters.status !== 'ALL') {
      invoices = invoices.filter((inv) => inv.status === filters.status);
    }

    if (filters.startDate) {
      invoices = invoices.filter((inv) => inv.date >= filters.startDate!);
    }

    if (filters.endDate) {
      invoices = invoices.filter((inv) => inv.date <= filters.endDate!);
    }

    if (filters.sortBy) {
      if (filters.sortBy === 'newest') {
        invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } else if (filters.sortBy === 'oldest') {
        invoices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      } else if (filters.sortBy === 'highest_pending') {
        invoices.sort((a, b) => b.pendingAmount - a.pendingAmount);
      } else if (filters.sortBy === 'highest_total') {
        invoices.sort((a, b) => b.grandTotal - a.grandTotal);
      }
    } else {
      // Default: newest first
      invoices.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
    }

    return invoices;
  }

  public getInvoiceById(id: string): Invoice | undefined {
    const cleanId = (id || '').trim().toLowerCase();
    return storageService.getInvoices().find((inv) => 
      inv.id.toLowerCase() === cleanId || 
      inv.invoiceNumber.toLowerCase() === cleanId
    );
  }

  public createInvoice(input: CreateInvoiceInput): Invoice {
    const invoices = storageService.getInvoices();
    const invoiceNumber = storageService.getNextInvoiceNumber();

    // Ensure customer exists or create new customer
    let customerId = input.customerId;
    if (!customerId) {
      // Look up by phone
      const existing = customerService.getCustomerByPhone(input.customerPhone);
      if (existing) {
        customerId = existing.id;
        // Optionally update name/address if changed
        customerService.updateCustomer(existing.id, {
          name: input.customerName,
          address: input.customerAddress || existing.address,
          gstNumber: input.customerGst || existing.gstNumber,
        });
      } else {
        const newCust = customerService.createCustomer({
          name: input.customerName,
          phone: input.customerPhone,
          address: input.customerAddress,
          gstNumber: input.customerGst,
        });
        customerId = newCust.id;
      }
    }

    const calculatedStatus = this.calculatePaymentStatus(input.grandTotal, input.paidAmount);
    const invoiceId = `inv-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const payments: PaymentRecord[] = [];
    if (input.paidAmount > 0) {
      const paymentRecord: PaymentRecord = {
        id: `pay-${invoiceId}-1`,
        invoiceId: invoiceId,
        invoiceNumber: invoiceNumber,
        customerId: customerId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        amount: input.paidAmount,
        paymentMethod: input.primaryPaymentMethod || 'CASH',
        referenceNote: calculatedStatus === 'PAID' ? 'Full initial payment' : 'Advance booking payment',
        date: input.date || getTodayDateString(),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        createdAt: nowIso,
      };
      payments.push(paymentRecord);

      // Record to global payments ledger
      const allPayments = storageService.getPayments();
      allPayments.unshift(paymentRecord);
      storageService.savePayments(allPayments);
    }

    const newInvoice: Invoice = {
      id: invoiceId,
      invoiceNumber: invoiceNumber,
      customerId: customerId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerAddress: input.customerAddress,
      customerGst: input.customerGst,
      date: input.date || getTodayDateString(),
      dueDate: input.dueDate,
      items: input.items.map((item, idx) => ({
        id: item.id || `item-${Date.now()}-${idx}`,
        productId: item.productId,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      subtotal: input.subtotal,
      discountType: input.discountType || 'fixed',
      discountValue: input.discountValue || 0,
      discountAmount: input.discountAmount || 0,
      grandTotal: input.grandTotal,
      paidAmount: input.paidAmount,
      pendingAmount: input.pendingAmount,
      status: calculatedStatus,
      primaryPaymentMethod: input.primaryPaymentMethod,
      payments: payments,
      notes: input.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    invoices.unshift(newInvoice);
    storageService.saveInvoices(invoices);
    storageService.recalculateCustomerStats(customerId);

    return newInvoice;
  }

  public updateInvoice(id: string, updates: Partial<Invoice>): Invoice | null {
    const invoices = storageService.getInvoices();
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) return null;

    const current = invoices[index];
    const updated: Invoice = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Recalculate status if amounts modified
    if (updates.grandTotal !== undefined || updates.paidAmount !== undefined) {
      const grandTotal = updates.grandTotal ?? current.grandTotal;
      const paidAmount = updates.paidAmount ?? current.paidAmount;
      updated.pendingAmount = Math.max(0, grandTotal - paidAmount);
      updated.status = this.calculatePaymentStatus(grandTotal, paidAmount);
    }

    invoices[index] = updated;
    storageService.saveInvoices(invoices);
    storageService.recalculateCustomerStats(updated.customerId);

    return updated;
  }

  public deleteInvoice(id: string): boolean {
    const invoices = storageService.getInvoices();
    const target = invoices.find((inv) => inv.id === id);
    if (!target) return false;

    const filtered = invoices.filter((inv) => inv.id !== id);
    storageService.saveInvoices(filtered);

    // Also remove associated payments
    const payments = storageService.getPayments().filter((p) => p.invoiceId !== id);
    storageService.savePayments(payments);

    storageService.recalculateCustomerStats(target.customerId);
    return true;
  }

  public getDashboardStats(): DashboardStats {
    const invoices = storageService.getInvoices();
    const payments = storageService.getPayments();
    const today = getTodayDateString();

    let todaySales = 0;
    let todayPending = 0;
    let totalOutstanding = 0;
    let totalRevenue = 0;
    let totalPaidAmount = 0;
    let pendingBillsCount = 0;

    invoices.forEach((inv) => {
      totalRevenue += inv.grandTotal;
      totalPaidAmount += inv.paidAmount;
      totalOutstanding += inv.pendingAmount;

      if (inv.pendingAmount > 0) {
        pendingBillsCount += 1;
      }

      if (inv.date === today) {
        todaySales += inv.grandTotal;
        todayPending += inv.pendingAmount;
      }
    });

    let todayCollections = 0;
    payments.forEach((p) => {
      if (p.date === today) {
        todayCollections += p.amount;
      }
    });

    const paidBillsCount = invoices.filter((i) => i.status === 'PAID' || i.pendingAmount === 0).length;

    return {
      todaySales,
      todayCollections,
      todayPending,
      totalOutstanding,
      totalBillsCount: invoices.length,
      totalPaidAmount,
      totalRevenue,
      pendingBillsCount,
      paidBillsCount,
    };
  }
}

export const invoiceService = new InvoiceService();
