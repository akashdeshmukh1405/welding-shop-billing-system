"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  UserPlus,
  Phone,
  MapPin,
  Building,
  ArrowRight,
  Receipt,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/common/EmptyState";
import { storageService } from "@/services/storageService";
import { customerService } from "@/services/customerService";
import { useToast } from "@/context/ToastContext";
import { Customer } from "@/types";
import { formatCurrency, formatDate, isValidIndianMobile } from "@/lib/utils";

export default function CustomersPage() {
  const router = useRouter();
  const toast = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Customer Form State
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newGst, setNewGst] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [formError, setFormError] = useState("");

  const loadCustomers = () => {
    const list = customerService.getCustomers(searchQuery);
    setCustomers(list);
  };

  useEffect(() => {
    loadCustomers();
  }, [searchQuery]);

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError("Customer name is required");
      return;
    }
    if (!isValidIndianMobile(newPhone)) {
      setFormError("Please enter a valid 10-digit Indian mobile number");
      return;
    }

    const created = customerService.createCustomer({
      name: newName,
      phone: newPhone,
      address: newAddress || undefined,
      gstNumber: newGst || undefined,
      notes: newNotes || undefined,
    });

    toast.success(`Customer ${created.name} added successfully`);
    setIsAddModalOpen(false);
    setNewName("");
    setNewPhone("");
    setNewAddress("");
    setNewGst("");
    setNewNotes("");
    setFormError("");
    loadCustomers();
  };

  const totalOutstanding = customers.reduce((sum, c) => sum + (c.totalPending || 0), 0);
  const totalBilled = customers.reduce((sum, c) => sum + (c.totalBilled || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs text-slate-500">
            View customer ledgers, transaction history, and pending balances
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          variant="primary"
          size="lg"
          className="font-bold shadow-md shadow-blue-500/20"
        >
          <UserPlus className="w-5 h-5" />
          Add Customer
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-blue-50/60 border-blue-200">
          <p className="text-xs font-bold text-blue-800 uppercase">Total Registered Customers</p>
          <p className="text-2xl font-black text-blue-950 mt-1">{customers.length}</p>
        </Card>
        <Card className="p-4 bg-emerald-50/60 border-emerald-200">
          <p className="text-xs font-bold text-emerald-800 uppercase">Total Lifetime Sales</p>
          <p className="text-2xl font-black text-emerald-950 mt-1">{formatCurrency(totalBilled)}</p>
        </Card>
        <Card className="p-4 bg-rose-50/60 border-rose-200">
          <p className="text-xs font-bold text-rose-800 uppercase">Total Due From Customers</p>
          <p className="text-2xl font-black text-rose-950 mt-1">{formatCurrency(totalOutstanding)}</p>
        </Card>
      </div>

      {/* Search Input */}
      <div className="w-full sm:w-96">
        <Input
          placeholder="Search by customer name, mobile, address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Customers List */}
      {customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description={
            searchQuery
              ? `No customers matched "${searchQuery}"`
              : "No customers in the system yet. Add one or generate a bill to create automatically."
          }
          actionLabel="Add Customer"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <Card
              key={c.id}
              onClick={() => router.push(`/customers/${c.id}`)}
              className="p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                      {c.name}
                    </h3>
                    <p className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      +91 {c.phone}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                {c.address && (
                  <p className="text-xs text-slate-500 mt-2 line-clamp-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    {c.address}
                  </p>
                )}

                {/* Ledger Summary */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Bills</p>
                    <p className="font-extrabold text-slate-900 mt-0.5">{c.totalBills || 0}</p>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Total</p>
                    <p className="font-extrabold text-slate-900 mt-0.5">{formatCurrency(c.totalBilled || 0)}</p>
                  </div>
                  <div className={`p-2 rounded-xl ${c.totalPending > 0 ? "bg-rose-50 text-rose-900" : "bg-emerald-50 text-emerald-900"}`}>
                    <p className="text-[10px] font-bold uppercase opacity-80">Due</p>
                    <p className="font-extrabold mt-0.5">{formatCurrency(c.totalPending || 0)}</p>
                  </div>
                </div>
              </div>

              {c.lastBillDate && (
                <p className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100 flex justify-between">
                  <span>Last Bill: {c.lastBillNumber}</span>
                  <span>{formatDate(c.lastBillDate)}</span>
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Add Customer Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Customer"
        size="md"
      >
        <form onSubmit={handleAddCustomer} className="space-y-4">
          <Input
            label="Customer Full Name"
            placeholder="e.g. Ramesh Kulkarni"
            required
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setFormError("");
            }}
          />

          <Input
            label="Mobile Number (WhatsApp)"
            placeholder="98XXXXXXXX"
            type="tel"
            maxLength={10}
            required
            prefixText="+91"
            value={newPhone}
            onChange={(e) => {
              setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
              setFormError("");
            }}
          />

          <Input
            label="Site / Delivery Address (Optional)"
            placeholder="e.g. Row House 7, Rambaug Colony, Paud Road"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
          />

          <Input
            label="GSTIN Number (Optional)"
            placeholder="e.g. 27AABCP1111A1Z1"
            value={newGst}
            onChange={(e) => setNewGst(e.target.value.toUpperCase())}
          />

          {formError && <p className="text-xs font-bold text-red-600">{formError}</p>}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="font-bold">
              Save Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
