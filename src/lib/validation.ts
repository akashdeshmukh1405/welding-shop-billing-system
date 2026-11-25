import { z } from "zod";
import { isValidIndianMobile } from "./utils";

export const customerSchema = z.object({
  name: z.string().min(2, "Customer name must be at least 2 characters"),
  phone: z.string().refine((val) => isValidIndianMobile(val), {
    message: "Enter a valid 10-digit Indian mobile number",
  }),
  address: z.string().optional(),
  gstNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const invoiceItemSchema = z.object({
  id: z.string(),
  productId: z.string().optional(),
  name: z.string().min(1, "Product or service name is required"),
  description: z.string().optional(),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  unit: z.enum(['piece', 'sq.ft', 'kg', 'meter', 'feet', 'hour', 'set', 'ton', 'inch'] as const),
  unitPrice: z.number().min(0, "Price cannot be negative"),
  total: z.number().min(0),
});

export const invoiceFormSchema = z.object({
  customerName: z.string().min(2, "Customer name is required"),
  customerPhone: z.string().refine((val) => isValidIndianMobile(val), {
    message: "Valid 10-digit Indian mobile number required",
  }),
  customerAddress: z.string().optional(),
  customerGst: z.string().optional(),
  date: z.string().min(1, "Invoice date is required"),
  items: z.array(invoiceItemSchema).min(1, "At least one item must be added to the bill"),
  subtotal: z.number().min(0),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0),
  discountAmount: z.number().min(0),
  grandTotal: z.number().min(0),
  paidAmount: z.number().min(0, "Paid amount cannot be negative"),
  pendingAmount: z.number().min(0),
  primaryPaymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER']),
  notes: z.string().optional(),
}).refine((data) => data.paidAmount <= data.grandTotal, {
  message: "Paid amount cannot be greater than the grand total",
  path: ["paidAmount"],
});

export const paymentCollectionSchema = z.object({
  amount: z.number().min(1, "Payment amount must be greater than ₹0"),
  paymentMethod: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'OTHER']),
  referenceNote: z.string().optional(),
  date: z.string().min(1, "Payment date is required"),
});

export const productSchema = z.object({
  name: z.string().min(2, "Product name is required"),
  description: z.string().optional(),
  defaultPrice: z.number().min(0, "Price cannot be negative"),
  unit: z.enum(['piece', 'sq.ft', 'kg', 'meter', 'feet', 'hour', 'set', 'ton', 'inch'] as const),
  category: z.string().optional(),
});

export const settingsSchema = z.object({
  shopName: z.string().min(2, "Shop name is required"),
  ownerName: z.string().min(2, "Owner name is required"),
  shopAddress: z.string().min(3, "Shop address is required"),
  shopPhone: z.string().min(10, "Valid phone number required"),
  altPhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  gstNumber: z.string().optional(),
  invoicePrefix: z.string().min(1, "Invoice prefix is required"),
  invoiceStartingNumber: z.number().min(1, "Starting number must be >= 1"),
  invoiceFooterMessage: z.string().optional(),
  upiId: z.string().optional(),
  upiQrEnabled: z.boolean().default(true),
  termsAndConditions: z.string().optional(),
  currencySymbol: z.string().default('₹'),
});
