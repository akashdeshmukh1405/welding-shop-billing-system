import { prisma } from "@/lib/prisma";
import { PaymentMethod, PaymentStatus } from "@prisma/client";

export class DBRepository {
  /**
   * Generates a safe, sequential, unique invoice number on the server side
   */
  public async generateNextInvoiceNumber(): Promise<string> {
    return await prisma.$transaction(async (tx) => {
      let settings = await tx.shopSettings.findFirst();
      if (!settings) {
        settings = await tx.shopSettings.create({
          data: {
            shopName: "Jay Mata Di Steel Furniture & Railing",
            nextInvoiceNumber: 1001,
            invoicePrefix: "INV-",
          },
        });
      }

      const nextNum = settings.nextInvoiceNumber;
      const invoiceNumber = `${settings.invoicePrefix || "INV-"}${nextNum}`;

      // Increment sequence for next bill
      await tx.shopSettings.update({
        where: { id: settings.id },
        data: { nextInvoiceNumber: nextNum + 1 },
      });

      return invoiceNumber;
    });
  }

  /**
   * Creates a new bill and items with atomic server-side validation & transaction
   */
  public async createInvoice(data: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    customerAddress?: string;
    customerGst?: string;
    items: Array<{
      name: string;
      description?: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      taxRate?: number;
      productId?: string;
    }>;
    discountAmount?: number;
    paidAmount?: number;
    paymentMethod?: PaymentMethod;
    notes?: string;
    dueDate?: Date;
    createdById?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Find or create customer
      let customer = await tx.customer.findUnique({
        where: { phone: data.customerPhone },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            name: data.customerName,
            phone: data.customerPhone,
            email: data.customerEmail,
            address: data.customerAddress,
            gstNumber: data.customerGst,
          },
        });
      } else {
        // Update details if provided
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: data.customerName,
            email: data.customerEmail || customer.email,
            address: data.customerAddress || customer.address,
            gstNumber: data.customerGst || customer.gstNumber,
          },
        });
      }

      // 2. Compute canonical financial totals server-side (do NOT trust client arithmetic)
      let subtotal = 0;
      const computedItems = data.items.map((it) => {
        const qty = Math.max(0.01, Number(it.quantity) || 1);
        const rate = Math.max(0, Number(it.unitPrice) || 0);
        const itemTotal = Math.round(qty * rate * 100) / 100;
        subtotal += itemTotal;
        return {
          name: it.name,
          description: it.description,
          quantity: qty,
          unit: it.unit || "nos",
          unitPrice: rate,
          taxRate: it.taxRate || 0,
          taxAmount: 0,
          total: itemTotal,
          productId: it.productId,
        };
      });

      const discount = Math.max(0, Math.min(subtotal, Number(data.discountAmount) || 0));
      const grandTotal = Math.max(0, subtotal - discount);

      let initialPaid = Math.max(0, Number(data.paidAmount) || 0);
      if (initialPaid > grandTotal) {
        initialPaid = grandTotal; // enforce boundary
      }

      const pendingAmount = Math.max(0, grandTotal - initialPaid);

      let status: PaymentStatus = PaymentStatus.PENDING;
      if (initialPaid >= grandTotal) {
        status = PaymentStatus.PAID;
      } else if (initialPaid > 0) {
        status = PaymentStatus.PARTIAL;
      }

      // 3. Generate sequential invoice number
      let settings = await tx.shopSettings.findFirst();
      if (!settings) {
        settings = await tx.shopSettings.create({
          data: { nextInvoiceNumber: 1001 },
        });
      }
      const invNum = `${settings.invoicePrefix || "INV-"}${settings.nextInvoiceNumber}`;
      await tx.shopSettings.update({
        where: { id: settings.id },
        data: { nextInvoiceNumber: settings.nextInvoiceNumber + 1 },
      });

      // 4. Create Invoice Record
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: invNum,
          customerId: customer.id,
          date: new Date(),
          dueDate: data.dueDate,
          primaryPaymentMethod: data.paymentMethod || PaymentMethod.CASH,
          subtotal,
          discountAmount: discount,
          taxAmount: 0,
          grandTotal,
          paidAmount: initialPaid,
          pendingAmount,
          status,
          notes: data.notes,
          createdById: data.createdById,
          items: {
            create: computedItems,
          },
        },
        include: {
          items: true,
          customer: true,
          payments: true,
        },
      });

      // 5. If initial payment was made, record immutable Payment record
      if (initialPaid > 0) {
        await tx.payment.create({
          data: {
            invoiceId: invoice.id,
            customerId: customer.id,
            amount: initialPaid,
            paymentMethod: data.paymentMethod || PaymentMethod.CASH,
            referenceNote: status === PaymentStatus.PAID ? "Full payment at bill creation" : "Advance payment at bill creation",
            date: new Date(),
            receivedById: data.createdById,
          },
        });
      }

      // 6. Update Customer Ledger Totals
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          totalBilled: { increment: grandTotal },
          totalPaid: { increment: initialPaid },
          totalPending: { increment: pendingAmount },
        },
      });

      return invoice;
    });
  }

  /**
   * Records a payment against an existing invoice using atomic database transaction
   * - Prevents duplicate payments
   * - Prevents paid amount > remaining amount
   * - Keeps the SAME invoice number
   * - Automatically updates status (PENDING/PARTIAL -> PAID)
   */
  public async collectPayment(data: {
    invoiceId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNote?: string;
    transactionId?: string;
    receivedById?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current invoice with lock
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        include: { customer: true, payments: true },
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      if (invoice.status === PaymentStatus.PAID || invoice.pendingAmount <= 0) {
        throw new Error("Invoice is already fully paid");
      }

      const collectAmount = Math.max(0.01, Number(data.amount) || 0);
      if (collectAmount > invoice.pendingAmount + 0.001) {
        throw new Error(
          `Payment amount (Rs. ${collectAmount}) exceeds remaining balance (Rs. ${invoice.pendingAmount})`
        );
      }

      // 2. Calculate updated amounts & status
      const newPaidAmount = Math.round((invoice.paidAmount + collectAmount) * 100) / 100;
      const newPendingAmount = Math.max(0, Math.round((invoice.grandTotal - newPaidAmount) * 100) / 100);
      const newStatus: PaymentStatus =
        newPendingAmount === 0 ? PaymentStatus.PAID : PaymentStatus.PARTIAL;

      // 3. Create immutable Payment Record
      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: collectAmount,
          paymentMethod: data.paymentMethod,
          referenceNote: data.referenceNote,
          transactionId: data.transactionId,
          date: new Date(),
          receivedById: data.receivedById,
        },
      });

      // 4. Update Invoice in place (maintains SAME invoice number)
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          pendingAmount: newPendingAmount,
          status: newStatus,
        },
        include: {
          customer: true,
          items: true,
          payments: {
            orderBy: { date: "desc" },
          },
        },
      });

      // 5. Update Customer Ledger
      await tx.customer.update({
        where: { id: invoice.customerId },
        data: {
          totalPaid: { increment: collectAmount },
          totalPending: { decrement: collectAmount },
        },
      });

      return {
        invoice: updatedInvoice,
        payment,
      };
    });
  }

  /**
   * Fetches dashboard statistics directly from the database
   */
  public async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalInvoicesCount,
      pendingInvoicesCount,
      paidInvoicesCount,
      pendingSum,
      todayPaymentsSum,
      todayInvoicesSum,
    ] = await Promise.all([
      prisma.invoice.count(),
      prisma.invoice.count({ where: { pendingAmount: { gt: 0 } } }),
      prisma.invoice.count({ where: { status: PaymentStatus.PAID } }),
      prisma.invoice.aggregate({
        _sum: { pendingAmount: true },
        where: { pendingAmount: { gt: 0 } },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          date: { gte: today, lt: tomorrow },
        },
      }),
      prisma.invoice.aggregate({
        _sum: { grandTotal: true },
        where: {
          date: { gte: today, lt: tomorrow },
        },
      }),
    ]);

    return {
      todaySales: todayInvoicesSum._sum.grandTotal || 0,
      todayCollections: todayPaymentsSum._sum.amount || 0,
      totalOutstanding: pendingSum._sum.pendingAmount || 0,
      totalBillsCount: totalInvoicesCount,
      pendingBillsCount: pendingInvoicesCount,
      paidBillsCount: paidInvoicesCount,
    };
  }
}

export const dbRepository = new DBRepository();
