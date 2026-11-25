import { Customer, DashboardStats, Invoice, PaymentRecord, Product, ShopSettings } from "../types";
import { initialCustomers, initialInvoices, initialPayments, initialProducts, initialShopSettings } from "../lib/seedData";
import { getTodayDateString } from "../lib/utils";

const STORAGE_KEYS = {
  SETTINGS: 'welding_shop_settings',
  PRODUCTS: 'welding_shop_products',
  CUSTOMERS: 'welding_shop_customers',
  INVOICES: 'welding_shop_invoices',
  PAYMENTS: 'welding_shop_payments',
  INITIALIZED: 'jaimatadi_shop_production_clean_v6',
};

class StorageService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  constructor() {
    if (this.isBrowser()) {
      this.initializeDefaultData();
    }
  }

  public initializeDefaultData(force = false): void {
    if (!this.isBrowser()) return;

    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED) || force) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialShopSettings));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(initialCustomers));
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(initialInvoices));
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(initialPayments));
      localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  }

  public cleanForCustomerHandover(): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(initialShopSettings));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }

  // --- Settings ---
  public getSettings(): ShopSettings {
    if (!this.isBrowser()) return initialShopSettings;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.shopName && parsed.shopName.includes("Akash")) {
          this.saveSettings(initialShopSettings);
          return initialShopSettings;
        }

        // Auto-migrate any previously cached Marathi/Devanagari shop branding to Roman/English
        const hasDevanagari = (s?: string) => s && /[\u0900-\u097F]/.test(s);
        let updated = false;

        if (!parsed.shopName || hasDevanagari(parsed.shopName) || parsed.shopName === "जय माता दी") {
          parsed.shopName = "JAI MATA DI";
          updated = true;
        }
        if (!parsed.businessCategory || hasDevanagari(parsed.businessCategory) || parsed.businessCategory.includes("स्टील")) {
          parsed.businessCategory = "STEEL FURNITURE & RAILING";
          updated = true;
        }
        if (!parsed.ownerName || hasDevanagari(parsed.ownerName) || parsed.ownerName.includes("वैभव") || parsed.ownerName.includes("Prop")) {
          parsed.ownerName = "Mr. Vaibhav Wagh";
          updated = true;
        }
        if (!parsed.shopAddress || hasDevanagari(parsed.shopAddress) || parsed.shopAddress.includes("नागगांव")) {
          parsed.shopAddress = "Naggaon Road, Bodwad, Dist. Jalgaon";
          updated = true;
        }
        if (hasDevanagari(parsed.headerTradition)) {
          parsed.headerTradition = "|| Shree ||";
          updated = true;
        }
        if (hasDevanagari(parsed.invoiceFooterMessage)) {
          parsed.invoiceFooterMessage = "Thank you! Visit again.";
          updated = true;
        }

        if (updated) {
          this.saveSettings(parsed);
        }

        return parsed;
      }
      return initialShopSettings;
    } catch {
      return initialShopSettings;
    }
  }

  public saveSettings(settings: ShopSettings): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  // --- Products ---
  public getProducts(): Product[] {
    if (!this.isBrowser()) return initialProducts;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : initialProducts;
    } catch {
      return initialProducts;
    }
  }

  public saveProducts(products: Product[]): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }

  // --- Customers ---
  public getCustomers(): Customer[] {
    if (!this.isBrowser()) return initialCustomers;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : initialCustomers;
    } catch {
      return initialCustomers;
    }
  }

  public saveCustomers(customers: Customer[]): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }

  // --- Invoices ---
  public getInvoices(): Invoice[] {
    if (!this.isBrowser()) return initialInvoices;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      return data ? JSON.parse(data) : initialInvoices;
    } catch {
      return initialInvoices;
    }
  }

  public saveInvoices(invoices: Invoice[]): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }

  public saveInvoice(invoice: Invoice): void {
    const list = this.getInvoices();
    const idx = list.findIndex((i) => i.id === invoice.id || i.invoiceNumber === invoice.invoiceNumber);
    if (idx >= 0) {
      list[idx] = invoice;
    } else {
      list.unshift(invoice);
    }
    this.saveInvoices(list);
  }

  // --- Payments ---
  public getPayments(): PaymentRecord[] {
    if (!this.isBrowser()) return initialPayments;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      return data ? JSON.parse(data) : initialPayments;
    } catch {
      return initialPayments;
    }
  }

  public savePayments(payments: PaymentRecord[]): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }

  public savePayment(payment: PaymentRecord): void {
    const list = this.getPayments();
    const idx = list.findIndex((p) => p.id === payment.id);
    if (idx >= 0) {
      list[idx] = payment;
    } else {
      list.unshift(payment);
    }
    this.savePayments(list);
  }

  // --- Generate Next Invoice Number ---
  public getNextInvoiceNumber(): string {
    const settings = this.getSettings();
    const prefix = settings.invoicePrefix || 'INV-';
    const invoices = this.getInvoices();

    if (invoices.length === 0) {
      return `${prefix}${settings.invoiceStartingNumber || 1001}`;
    }

    // Extract numbers from existing invoices with matching prefix
    let maxNumber = settings.invoiceStartingNumber || 1000;
    invoices.forEach((inv) => {
      if (inv.invoiceNumber && inv.invoiceNumber.startsWith(prefix)) {
        const numPart = parseInt(inv.invoiceNumber.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxNumber) {
          maxNumber = numPart;
        }
      }
    });

    return `${prefix}${maxNumber + 1}`;
  }

  // --- Sync Customer Aggregates ---
  public recalculateCustomerStats(customerId: string): void {
    const customers = this.getCustomers();
    const invoices = this.getInvoices().filter((inv) => inv.customerId === customerId);

    const customerIndex = customers.findIndex((c) => c.id === customerId);
    if (customerIndex === -1) return;

    let totalBilled = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let lastDate: string | undefined = undefined;
    let lastNumber: string | undefined = undefined;

    // Sort invoices by date desc
    const sorted = [...invoices].sort(
      (a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
    );

    sorted.forEach((inv, index) => {
      totalBilled += inv.grandTotal;
      totalPaid += inv.paidAmount;
      totalPending += inv.pendingAmount;
      if (index === 0) {
        lastDate = inv.date;
        lastNumber = inv.invoiceNumber;
      }
    });

    customers[customerIndex] = {
      ...customers[customerIndex],
      totalBills: invoices.length,
      totalBilled,
      totalPaid,
      totalPending,
      lastBillDate: lastDate,
      lastBillNumber: lastNumber,
      updatedAt: new Date().toISOString(),
    };

    this.saveCustomers(customers);
  }

  public recalculateAllCustomerStats(): void {
    const customers = this.getCustomers();
    customers.forEach((c) => {
      this.recalculateCustomerStats(c.id);
    });
  }

  // --- Export / Import / Reset ---
  public exportAllData(): string {
    const backup = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      settings: this.getSettings(),
      products: this.getProducts(),
      customers: this.getCustomers(),
      invoices: this.getInvoices(),
      payments: this.getPayments(),
    };
    return JSON.stringify(backup, null, 2);
  }

  public importAllData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.settings) this.saveSettings(data.settings);
      if (data.products) this.saveProducts(data.products);
      if (data.customers) this.saveCustomers(data.customers);
      if (data.invoices) this.saveInvoices(data.invoices);
      if (data.payments) this.savePayments(data.payments);
      return true;
    } catch (e) {
      console.error("Failed to import data", e);
      return false;
    }
  }

  public resetAllData(): void {
    this.initializeDefaultData(true);
  }
}

export const storageService = new StorageService();
