import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbRepository } from "@/services/dbRepository";
import { storageService } from "@/services/storageService";
import { PaymentMethod } from "@prisma/client";

const CreateInvoiceSchema = z.object({
  customerName: z.string().min(2, "Customer name is required"),
  customerPhone: z.string().regex(/^\d{10}$/, "10-digit mobile number required"),
  customerEmail: z.string().email().optional().or(z.literal("")),
  customerAddress: z.string().optional(),
  customerGst: z.string().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1, "Item name required"),
        description: z.string().optional(),
        quantity: z.number().positive("Quantity must be greater than 0"),
        unit: z.string().default("nos"),
        unitPrice: z.number().min(0, "Rate cannot be negative"),
        taxRate: z.number().min(0).optional(),
        productId: z.string().optional(),
      })
    )
    .min(1, "At least one product/service item is required"),
  discountAmount: z.number().min(0).default(0),
  paidAmount: z.number().min(0).default(0),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  notes: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const status = searchParams.get("status");

    let invoices = storageService.getInvoices();

    if (query) {
      const q = query.toLowerCase();
      invoices = invoices.filter(
        (inv) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          inv.customerPhone.includes(q)
      );
    }

    if (status && status !== "ALL") {
      invoices = invoices.filter((inv) => inv.status === status);
    }

    return NextResponse.json({ success: true, data: invoices });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const validated = CreateInvoiceSchema.parse(json);

    // If PostgreSQL DATABASE_URL is configured, use transactional database repository
    if (process.env.DATABASE_URL) {
      const invoice = await dbRepository.createInvoice({
        ...validated,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
      });

      return NextResponse.json({
        success: true,
        message: "Invoice created successfully",
        data: invoice,
      });
    }

    // Fallback in-memory/standalone storage mode with strict server validation
    let subtotal = 0;
    const items = validated.items.map((it, idx) => {
      const itemTotal = it.quantity * it.unitPrice;
      subtotal += itemTotal;
      return {
        id: `item-${Date.now()}-${idx}`,
        name: it.name,
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        taxRate: it.taxRate || 0,
        taxAmount: 0,
        total: itemTotal,
      };
    });

    const discountAmount = Math.min(subtotal, validated.discountAmount);
    const grandTotal = subtotal - discountAmount;
    const paidAmount = Math.min(grandTotal, validated.paidAmount);
    const pendingAmount = grandTotal - paidAmount;

    let invoiceStatus: "PENDING" | "PARTIAL" | "PAID" = "PENDING";
    if (paidAmount >= grandTotal) {
      invoiceStatus = "PAID";
    } else if (paidAmount > 0) {
      invoiceStatus = "PARTIAL";
    }

    const settings = storageService.getSettings();
    const nextNum = settings.nextInvoiceNumber || settings.invoiceStartingNumber || 1001;
    const invNo = `${settings.invoicePrefix || "INV-"}${nextNum}`;

    const newInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNo,
      customerId: `cust-${Date.now()}`,
      customerName: validated.customerName,
      customerPhone: validated.customerPhone,
      customerAddress: validated.customerAddress,
      customerGst: validated.customerGst,
      date: new Date().toISOString(),
      dueDate: validated.dueDate,
      items,
      subtotal,
      discountAmount,
      taxAmount: 0,
      grandTotal,
      paidAmount,
      pendingAmount,
      status: invoiceStatus,
      primaryPaymentMethod: validated.paymentMethod as any,
      notes: validated.notes,
      payments:
        paidAmount > 0
          ? [
              {
                id: `pay-${Date.now()}`,
                invoiceId: `inv-${Date.now()}`,
                customerId: `cust-${Date.now()}`,
                amount: paidAmount,
                paymentMethod: validated.paymentMethod as any,
                referenceNote: invoiceStatus === "PAID" ? "Full payment at creation" : "Advance payment",
                date: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              },
            ]
          : [],
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: "Invoice created successfully",
      data: newInvoice,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Invalid invoice data" },
      { status: 400 }
    );
  }
}
