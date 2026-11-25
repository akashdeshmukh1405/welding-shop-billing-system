"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  Phone,
  MapPin,
  Building,
  ArrowLeft,
  PlusCircle,
  Receipt,
  History,
  CreditCard,
  MessageCircle,
  Printer,
  Edit,
  Trash2,
  Users,
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { PaymentStatusBadge, PaymentMethodBadge } from "@/components/ui/Badge";
import { PaymentCollectorModal } from "@/components/billing/PaymentCollectorModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { storageService } from "@/services/storageService";
import { customerService } from "@/services/customerService";
import { invoiceService } from "@/services/invoiceService";
import { whatsappService } from "@/services/whatsappService";
import { useToast } from "@/context/ToastContext";
import { Customer, CustomerLedgerEntry, Invoice, LinkedFamilyContact, PaymentRecord } from "@/types";
import { formatCurrency, formatDate, formatDateTime, isValidIndianMobile } from "@/lib/utils";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [ledgerData, setLedgerData] = useState<{
    ledger: CustomerLedgerEntry[];
    totalBilled: number;
    totalPaid: number;
    consolidatedBalance: number;
  }>({ ledger: [], totalBilled: 0, totalPaid: 0, consolidatedBalance: 0 });

  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteCustomerOpen, setIsDeleteCustomerOpen] = useState(false);

  // Linked Family Modal State
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [familyContactName, setFamilyContactName] = useState("");
  const [familyContactPhone, setFamilyContactPhone] = useState("");
  const [familyContactRelation, setFamilyContactRelation] = useState("Son");

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editGst, setEditGst] = useState("");

  const loadCustomerData = () => {
    const cust = customerService.getCustomerById(id);
    if (!cust) {
      toast.error("Customer not found");
      router.push("/customers");
      return;
    }
    setCustomer(cust);
    setEditName(cust.name);
    setEditPhone(cust.phone);
    setEditAddress(cust.address || "");
    setEditGst(cust.gstNumber || "");

    const allInvoices = storageService.getInvoices().filter((inv) => inv.customerId === cust.id);
    setInvoices(allInvoices);

    const allPayments = storageService.getPayments().filter((p) => p.customerId === cust.id);
    setPayments(allPayments);

    // Load Khatabook-style ledger
    const ledgerResult = customerService.getCustomerLedger(cust.id);
    setLedgerData(ledgerResult);
  };

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  if (!customer) return null;

  const handleUpdateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!isValidIndianMobile(editPhone)) {
      toast.error("Valid 10-digit mobile number required");
      return;
    }

    customerService.updateCustomer(customer.id, {
      name: editName,
      phone: editPhone,
      address: editAddress || undefined,
      gstNumber: editGst || undefined,
    });

    toast.success("Customer profile updated");
    setIsEditModalOpen(false);
    loadCustomerData();
  };

  const handleAddFamilyContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyContactName.trim() || !familyContactPhone.trim()) {
      toast.error("Please enter family member's name and mobile number");
      return;
    }
    if (!isValidIndianMobile(familyContactPhone)) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    try {
      customerService.linkFamilyContact(customer.id, {
        name: familyContactName.trim(),
        phone: familyContactPhone.trim(),
        relationship: familyContactRelation.trim() || "Son",
      });
      toast.success(`Linked ${familyContactName} (${familyContactRelation}) to ${customer.name}`);
      setFamilyContactName("");
      setFamilyContactPhone("");
      setFamilyContactRelation("Son");
      setIsFamilyModalOpen(false);
      loadCustomerData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to link family member");
    }
  };

  const handleRemoveFamilyContact = (contactId: string) => {
    customerService.removeFamilyContact(customer.id, contactId);
    toast.success("Family contact removed");
    loadCustomerData();
  };

  const handleDeleteCustomer = () => {
    customerService.deleteCustomer(customer.id);
    toast.success("Customer removed");
    router.push("/customers");
  };

  const handleCreateBillForCustomer = () => {
    router.push(`/bills/new?customerId=${customer.id}`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="md" onClick={() => router.push("/customers")}>
            <ArrowLeft className="w-4 h-4" />
            Customers
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {customer.name}
            </h1>
            <p className="text-xs text-slate-500">Customer Account & Khatabook Ledger</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleCreateBillForCustomer}
            variant="primary"
            size="md"
            className="font-bold bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="w-4 h-4" />
            Create Bill for {customer.name.split(" ")[0]}
          </Button>
          <Button onClick={() => setIsEditModalOpen(true)} variant="outline" size="md">
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            onClick={() => setIsDeleteCustomerOpen(true)}
            variant="ghost"
            size="md"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Customer Info & Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Contact Info Card */}
        <Card className="p-5 md:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase">Primary Contact</p>
            <button
              onClick={() => setIsFamilyModalOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              + Link Family Member
            </button>
          </div>
          <div className="space-y-1.5 text-sm">
            <p className="font-semibold text-slate-800 flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-600" />
              +91 {customer.phone}
            </p>
            {customer.address && (
              <p className="text-xs text-slate-600 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                {customer.address}
              </p>
            )}
            {customer.gstNumber && (
              <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-400" />
                GSTIN: <span className="font-mono">{customer.gstNumber}</span>
              </p>
            )}

            {/* Linked Family Members Badges */}
            {customer.familyContacts && customer.familyContacts.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  Linked Family Contacts ({customer.familyContacts.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {customer.familyContacts.map((f) => (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-medium"
                    >
                      <span>
                        <strong>{f.name}</strong> ({f.relationship}) - +91 {f.phone}
                      </span>
                      <button
                        onClick={() => handleRemoveFamilyContact(f.id)}
                        className="text-rose-500 hover:text-rose-700 ml-1 font-bold"
                        title="Remove linked contact"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Total Billed */}
        <Card className="p-5 bg-blue-50/50 border-blue-200">
          <p className="text-xs font-bold text-blue-800 uppercase">Total Billed</p>
          <p className="text-2xl font-black text-blue-950 mt-1">{formatCurrency(ledgerData.totalBilled)}</p>
          <p className="text-xs text-blue-700 font-medium mt-1">{invoices.length} Invoices Recorded</p>
        </Card>

        {/* Consolidated Outstanding Balance */}
        <Card
          className={`p-5 border-2 ${
            ledgerData.consolidatedBalance > 0
              ? "bg-rose-50 border-rose-300 text-rose-950"
              : "bg-emerald-50 border-emerald-300 text-emerald-950"
          }`}
        >
          <p className="text-xs font-bold uppercase opacity-80">Consolidated Due</p>
          <p className="text-2xl font-black mt-1">{formatCurrency(ledgerData.consolidatedBalance)}</p>
          <p className="text-xs font-bold mt-1">
            {ledgerData.consolidatedBalance > 0 ? "⚠️ Outstanding Balance" : "✓ Account Settled"}
          </p>
        </Card>
      </div>

      {/* KHATABOOK-STYLE TRANSACTION LEDGER */}
      <Card className="border-2 border-slate-300 shadow-md">
        <CardHeader className="bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-700" />
            <div>
              <CardTitle className="text-base sm:text-lg">Khatabook Customer Statement</CardTitle>
              <p className="text-xs text-slate-500">
                Running chronological balance across all bills & payments
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-400 uppercase">Current Balance</span>
            <p className="text-lg font-black text-rose-700">{formatCurrency(ledgerData.consolidatedBalance)}</p>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {ledgerData.ledger.length === 0 ? (
            <p className="text-sm text-slate-400 italic p-6">No transactions recorded for this customer yet.</p>
          ) : (
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Transaction / Details</th>
                  <th className="py-3 px-4 text-right text-rose-700">Billed (Debit)</th>
                  <th className="py-3 px-4 text-right text-emerald-700">Received (Credit)</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerData.ledger.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-600">
                      {formatDate(entry.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {entry.type === "BILL" ? (
                          <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <div>
                          <p className="font-bold text-slate-900">{entry.description}</p>
                          {entry.paymentMethod && (
                            <span className="text-[11px] text-slate-400">Mode: {entry.paymentMethod}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-rose-600 whitespace-nowrap">
                      {entry.debit > 0 ? `+${formatCurrency(entry.debit)}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600 whitespace-nowrap">
                      {entry.credit > 0 ? `-${formatCurrency(entry.credit)}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                      {formatCurrency(entry.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <CardTitle>Invoices for this Customer ({invoices.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-400 italic p-6">No invoices created for this customer yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => router.push(`/bills/${inv.id}`)}
                  className="p-4 hover:bg-slate-50 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900">{inv.invoiceNumber}</span>
                        <PaymentStatusBadge status={inv.status} size="sm" />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDate(inv.date)} • {inv.items.length} {inv.items.length === 1 ? "item" : "items"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <p className="font-bold text-slate-900">{formatCurrency(inv.grandTotal)}</p>
                      {inv.pendingAmount > 0 ? (
                        <p className="text-xs font-bold text-rose-600">Due: {formatCurrency(inv.pendingAmount)}</p>
                      ) : (
                        <p className="text-xs text-emerald-600 font-semibold">Paid in full</p>
                      )}
                    </div>

                    {inv.pendingAmount > 0 && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedInvoiceForPayment(inv);
                        }}
                        variant="success"
                        size="sm"
                        className="text-xs font-bold h-8 px-3"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Collect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Receipts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            <CardTitle>Customer Payment History Ledger ({payments.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-400 italic py-2">No payment transactions recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {payments.map((p, idx) => (
                <div
                  key={p.id || idx}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      ✓
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{formatCurrency(p.amount)}</span>
                        <PaymentMethodBadge method={p.paymentMethod} />
                        <span className="text-xs text-slate-400 font-mono">({p.invoiceNumber})</span>
                      </div>
                      {p.referenceNote && <p className="text-xs text-slate-500 mt-0.5">{p.referenceNote}</p>}
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">{formatDate(p.date)}</p>
                    {p.time && <p>{p.time}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collect Payment Modal */}
      <PaymentCollectorModal
        isOpen={!!selectedInvoiceForPayment}
        onClose={() => setSelectedInvoiceForPayment(null)}
        invoice={selectedInvoiceForPayment}
        onPaymentSuccess={loadCustomerData}
      />

      {/* Add Linked Family Contact Modal */}
      <Modal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        title="Link Family Member or Shared Contact"
      >
        <form onSubmit={handleAddFamilyContact} className="space-y-4">
          <p className="text-xs text-slate-500">
            Link a family member (e.g. Son, Brother, Wife) so if they call or visit the shop with their own number, their new work and payments can be added to {customer.name}&apos;s customer account.
          </p>

          <Input
            label="Family Member Name"
            placeholder="e.g. Rahul Patil"
            required
            value={familyContactName}
            onChange={(e) => setFamilyContactName(e.target.value)}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Relationship
            </label>
            <select
              value={familyContactRelation}
              onChange={(e) => setFamilyContactRelation(e.target.value)}
              className="w-full h-11 px-3 text-sm bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-600 outline-none"
            >
              <option value="Son">Son</option>
              <option value="Father">Father</option>
              <option value="Brother">Brother</option>
              <option value="Wife">Wife</option>
              <option value="Mother">Mother</option>
              <option value="Partner">Business Partner</option>
              <option value="Other">Other Relative</option>
            </select>
          </div>

          <Input
            label="Family Member Mobile Number"
            placeholder="98XXXXXXXX"
            type="tel"
            maxLength={10}
            required
            prefixText="+91"
            value={familyContactPhone}
            onChange={(e) => setFamilyContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsFamilyModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="font-bold">
              Link Contact
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Customer Details">
        <form onSubmit={handleUpdateCustomer} className="space-y-4">
          <Input
            label="Customer Name"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <Input
            label="Mobile Number"
            type="tel"
            required
            prefixText="+91"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
          <Input
            label="Site / Delivery Address"
            value={editAddress}
            onChange={(e) => setEditAddress(e.target.value)}
          />
          <Input
            label="GSTIN Number"
            value={editGst}
            onChange={(e) => setEditGst(e.target.value.toUpperCase())}
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="font-bold">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteCustomerOpen}
        onClose={() => setIsDeleteCustomerOpen(false)}
        onConfirm={handleDeleteCustomer}
        title="Delete Customer?"
        message={`Are you sure you want to delete ${customer.name}? Note: Invoices created under this customer will remain in billing records.`}
        confirmText="Delete Customer"
      />
    </div>
  );
}
