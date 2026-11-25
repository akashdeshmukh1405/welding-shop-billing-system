export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING';

export type PaymentMethod = 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';

export type ProductUnit = 'piece' | 'sq.ft' | 'kg' | 'meter' | 'feet' | 'hour' | 'set' | 'ton' | 'inch';

export interface ShopSettings {
  id: string;
  headerTradition?: string; // e.g. || Shree ||
  shopName: string; // e.g. JAI MATA DI
  businessCategory?: string; // e.g. STEEL FURNITURE & RAILING
  ownerName: string; // e.g. Mr. Vaibhav Wagh
  shopAddress: string; // e.g. Naggaon Road, Bodwad, Dist. Jalgaon
  shopPhone: string; // e.g. 9561482326
  altPhone?: string;
  email?: string;
  gstNumber?: string;
  logoUrl?: string;
  invoicePrefix: string;
  invoiceStartingNumber: number;
  nextInvoiceNumber?: number;
  invoiceFooterMessage: string;
  upiId?: string;
  upiQrEnabled: boolean;
  termsAndConditions?: string;
  currencySymbol: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  defaultPrice: number;
  unit: ProductUnit;
  category?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  quantity: number;
  unit: ProductUnit;
  unitPrice: number;
  total: number;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNote?: string;
  transactionId?: string;
  date: string; // ISO format or YYYY-MM-DD
  time?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerGst?: string;
  date: string; // YYYY-MM-DD
  dueDate?: string;
  items: InvoiceItem[];
  subtotal: number;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  discountAmount: number;
  taxRate?: number;
  taxAmount?: number;
  grandTotal: number;
  paidAmount: number;
  pendingAmount: number;
  status: PaymentStatus;
  primaryPaymentMethod: PaymentMethod;
  payments: PaymentRecord[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedFamilyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string; // e.g. 'Son', 'Father', 'Brother', 'Wife', 'Partner', 'Other'
  createdAt: string;
}

export interface CustomerLedgerEntry {
  id: string;
  date: string;
  type: 'BILL' | 'PAYMENT';
  invoiceId?: string;
  invoiceNumber?: string;
  paymentId?: string;
  description: string;
  debit: number; // Bill added (increases customer balance)
  credit: number; // Payment received (decreases customer balance)
  runningBalance: number; // Consolidated outstanding balance after this entry
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  gstNumber?: string;
  familyContacts?: LinkedFamilyContact[];
  totalBills: number;
  totalBilled: number;
  totalPaid: number;
  totalPending: number;
  lastBillDate?: string;
  lastBillNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  todaySales: number;
  todayCollections: number;
  todayPending: number;
  totalOutstanding: number;
  totalBillsCount: number;
  totalPaidAmount: number;
  totalRevenue: number;
  pendingBillsCount: number;
  paidBillsCount: number;
}

export interface InvoiceFilterParams {
  query?: string;
  status?: PaymentStatus | 'ALL';
  startDate?: string;
  endDate?: string;
  sortBy?: 'newest' | 'oldest' | 'highest_pending' | 'highest_total';
}
