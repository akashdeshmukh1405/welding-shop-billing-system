import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbRepository } from "@/services/dbRepository";
import { storageService } from "@/services/storageService";
import { PaymentMethod } from "@prisma/client";

const CollectPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  referenceNote: z.string().optional(),
  transactionId: z.string().optional(),
});

export async function GET() {
  try {
    const payments = storageService.getPayments();
    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const validated = CollectPaymentSchema.parse(json);

    // If PostgreSQL DATABASE_URL is configured, use transactional database repository
    if (process.env.DATABASE_URL) {
      const result = await dbRepository.collectPayment(validated);
      return NextResponse.json({
        success: true,
        message: "Payment recorded successfully",
        data: result,
      });
    }

    // Standalone fallback: Fetch invoice from storage and validate
    const invoices = storageService.getInvoices();
    const invoice = invoices.find((i) => i.id === validated.invoiceId || i.invoiceNumber === validated.invoiceId);

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.pendingAmount <= 0 || invoice.status === "PAID") {
      return NextResponse.json(
        { success: false, message: "Invoice is already fully settled" },
        { status: 400 }
      );
    }

    if (validated.amount > invoice.pendingAmount + 0.001) {
      return NextResponse.json(
        {
          success: false,
          message: `Payment amount (Rs. ${validated.amount}) exceeds remaining balance (Rs. ${invoice.pendingAmount})`,
        },
        { status: 400 }
      );
    }

    const newPaid = invoice.paidAmount + validated.amount;
    const newPending = Math.max(0, invoice.grandTotal - newPaid);
    const newStatus: "PAID" | "PARTIAL" = newPending === 0 ? "PAID" : "PARTIAL";

    const paymentRecord = {
      id: `pay-${Date.now()}`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      customerPhone: invoice.customerPhone,
      amount: validated.amount,
      paymentMethod: validated.paymentMethod as any,
      referenceNote: validated.referenceNote,
      transactionId: validated.transactionId,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    invoice.paidAmount = newPaid;
    invoice.pendingAmount = newPending;
    invoice.status = newStatus;
    if (!invoice.payments) invoice.payments = [];
    invoice.payments.unshift(paymentRecord);

    storageService.saveInvoice(invoice);
    storageService.savePayment(paymentRecord);
    storageService.recalculateCustomerStats(invoice.customerId);

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        invoice,
        payment: paymentRecord,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Invalid payment request" },
      { status: 400 }
    );
  }
}
