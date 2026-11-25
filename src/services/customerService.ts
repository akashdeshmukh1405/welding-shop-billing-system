import { Customer, CustomerLedgerEntry, LinkedFamilyContact } from "../types";
import { storageService } from "./storageService";
import { sanitizePhone } from "../lib/utils";

class CustomerService {
  public getCustomers(query?: string): Customer[] {
    const customers = storageService.getCustomers();
    if (!query || !query.trim()) {
      return [...customers].sort((a, b) => (b.totalPending || 0) - (a.totalPending || 0));
    }
    const q = query.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.familyContacts &&
          c.familyContacts.some(
            (f) =>
              f.name.toLowerCase().includes(q) ||
              f.phone.includes(q) ||
              f.relationship.toLowerCase().includes(q)
          ))
    );
  }

  public getCustomerById(id: string): Customer | undefined {
    return storageService.getCustomers().find((c) => c.id === id);
  }

  public getCustomerByPhone(phone: string): Customer | undefined {
    const clean = sanitizePhone(phone);
    return storageService.getCustomers().find((c) => sanitizePhone(c.phone) === clean);
  }

  /**
   * Search by primary phone OR any linked family member's phone number
   */
  public searchCustomerByAnyPhone(phone: string): {
    customer: Customer;
    matchedVia: 'PRIMARY' | 'FAMILY';
    matchedContact?: LinkedFamilyContact;
  } | null {
    const clean = sanitizePhone(phone);
    if (!clean || clean.length < 10) return null;

    const customers = storageService.getCustomers();

    // 1. Check Primary Phone
    const primaryMatch = customers.find((c) => sanitizePhone(c.phone) === clean);
    if (primaryMatch) {
      return { customer: primaryMatch, matchedVia: 'PRIMARY' };
    }

    // 2. Check Linked Family Contacts
    for (const c of customers) {
      if (c.familyContacts && c.familyContacts.length > 0) {
        const familyMatch = c.familyContacts.find((f) => sanitizePhone(f.phone) === clean);
        if (familyMatch) {
          return { customer: c, matchedVia: 'FAMILY', matchedContact: familyMatch };
        }
      }
    }

    return null;
  }

  public createCustomer(data: {
    name: string;
    phone: string;
    address?: string;
    gstNumber?: string;
    notes?: string;
    familyContacts?: LinkedFamilyContact[];
  }): Customer {
    const customers = storageService.getCustomers();
    const nowIso = new Date().toISOString();
    const cleanPhone = sanitizePhone(data.phone);

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: data.name.trim(),
      phone: cleanPhone,
      address: data.address?.trim(),
      gstNumber: data.gstNumber?.trim(),
      familyContacts: data.familyContacts || [],
      totalBills: 0,
      totalBilled: 0,
      totalPaid: 0,
      totalPending: 0,
      notes: data.notes,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    customers.unshift(newCustomer);
    storageService.saveCustomers(customers);
    return newCustomer;
  }

  public linkFamilyContact(
    customerId: string,
    contact: { name: string; phone: string; relationship: string }
  ): Customer | null {
    const customer = this.getCustomerById(customerId);
    if (!customer) return null;

    const cleanPhone = sanitizePhone(contact.phone);
    const existingContacts = customer.familyContacts || [];

    // Avoid duplicate phone within the same customer
    const alreadyLinked = existingContacts.some((f) => sanitizePhone(f.phone) === cleanPhone);
    if (alreadyLinked) {
      throw new Error(`Mobile number ${cleanPhone} is already linked to this customer account.`);
    }

    const newContact: LinkedFamilyContact = {
      id: `fam-${Date.now()}`,
      name: contact.name.trim(),
      phone: cleanPhone,
      relationship: contact.relationship.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedContacts = [...existingContacts, newContact];
    return this.updateCustomer(customerId, { familyContacts: updatedContacts });
  }

  public removeFamilyContact(customerId: string, contactId: string): Customer | null {
    const customer = this.getCustomerById(customerId);
    if (!customer) return null;

    const existingContacts = customer.familyContacts || [];
    const updatedContacts = existingContacts.filter((f) => f.id !== contactId);
    return this.updateCustomer(customerId, { familyContacts: updatedContacts });
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const customers = storageService.getCustomers();
    const index = customers.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const current = customers[index];
    const updated: Customer = {
      ...current,
      ...updates,
      phone: updates.phone ? sanitizePhone(updates.phone) : current.phone,
      updatedAt: new Date().toISOString(),
    };

    customers[index] = updated;
    storageService.saveCustomers(customers);
    return updated;
  }

  public deleteCustomer(id: string): boolean {
    const customers = storageService.getCustomers();
    const filtered = customers.filter((c) => c.id !== id);
    if (filtered.length === customers.length) return false;
    storageService.saveCustomers(filtered);
    return true;
  }

  /**
   * Generates a Khatabook-style transaction ledger for a customer
   * Displays bills (debit) and payments (credit) in chronological sequence with running balance
   */
  public getCustomerLedger(customerId: string): {
    ledger: CustomerLedgerEntry[];
    totalBilled: number;
    totalPaid: number;
    consolidatedBalance: number;
  } {
    const invoices = storageService.getInvoices().filter((inv) => inv.customerId === customerId);
    const payments = storageService.getPayments().filter((p) => p.customerId === customerId);

    interface RawEvent {
      timestamp: number;
      date: string;
      type: 'BILL' | 'PAYMENT';
      invoiceId?: string;
      invoiceNumber?: string;
      paymentId?: string;
      description: string;
      debit: number;
      credit: number;
      paymentMethod?: any;
      notes?: string;
    }

    const events: RawEvent[] = [];

    // Add Invoices as DEBIT (customer owes)
    invoices.forEach((inv) => {
      const ts = new Date(inv.createdAt || inv.date).getTime();
      events.push({
        timestamp: ts,
        date: inv.date,
        type: 'BILL',
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        description: `Bill ${inv.invoiceNumber} (${inv.items.length} items)`,
        debit: inv.grandTotal,
        credit: 0,
        notes: inv.notes,
      });
    });

    // Add Payments as CREDIT (customer paid)
    payments.forEach((pay) => {
      const ts = new Date(pay.createdAt || pay.date).getTime();
      events.push({
        timestamp: ts,
        date: pay.date,
        type: 'PAYMENT',
        invoiceId: pay.invoiceId,
        invoiceNumber: pay.invoiceNumber,
        paymentId: pay.id,
        description: pay.referenceNote || `Payment for ${pay.invoiceNumber}`,
        debit: 0,
        credit: pay.amount,
        paymentMethod: pay.paymentMethod,
      });
    });

    // Sort chronologically (oldest to newest)
    events.sort((a, b) => a.timestamp - b.timestamp);

    let runningBalance = 0;
    let totalBilled = 0;
    let totalPaid = 0;

    const ledger: CustomerLedgerEntry[] = events.map((ev, idx) => {
      totalBilled += ev.debit;
      totalPaid += ev.credit;
      runningBalance = Math.round((runningBalance + ev.debit - ev.credit) * 100) / 100;

      return {
        id: `ledger-${idx}-${ev.timestamp}`,
        date: ev.date,
        type: ev.type,
        invoiceId: ev.invoiceId,
        invoiceNumber: ev.invoiceNumber,
        paymentId: ev.paymentId,
        description: ev.description,
        debit: ev.debit,
        credit: ev.credit,
        runningBalance: Math.max(0, runningBalance),
        paymentMethod: ev.paymentMethod,
        notes: ev.notes,
      };
    });

    return {
      ledger,
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      consolidatedBalance: Math.max(0, Math.round(runningBalance * 100) / 100),
    };
  }
}

export const customerService = new CustomerService();
