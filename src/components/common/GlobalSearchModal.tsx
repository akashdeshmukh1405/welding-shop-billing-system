"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Search, FileText, User, Package, ArrowRight, X } from "lucide-react";
import { storageService } from "@/services/storageService";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { Customer, Invoice, Product } from "@/types";

export function GlobalSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setInvoices([]);
      setCustomers([]);
      setProducts([]);
      return;
    }

    const q = query.toLowerCase().trim();
    const allInvoices = storageService.getInvoices();
    const allCustomers = storageService.getCustomers();
    const allProducts = storageService.getProducts();

    const matchedInvoices = allInvoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPhone.includes(q)
    ).slice(0, 5);

    const matchedCustomers = allCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q))
    ).slice(0, 4);

    const matchedProducts = allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    ).slice(0, 4);

    setInvoices(matchedInvoices);
    setCustomers(matchedCustomers);
    setProducts(matchedProducts);
  }, [query]);

  const handleNavigate = (path: string) => {
    onClose();
    router.push(path);
  };

  const hasResults = invoices.length > 0 || customers.length > 0 || products.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" showCloseButton={false}>
      <div className="space-y-4 -mt-2">
        <div className="relative flex items-center border-b border-slate-200 pb-3">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search bills, customer name, mobile number, products..."
            className="w-full text-base bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {query.trim() === "" && (
          <div className="py-8 text-center text-slate-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Type invoice number, customer name, mobile or item to search</p>
          </div>
        )}

        {query.trim() !== "" && !hasResults && (
          <div className="py-8 text-center text-slate-500">
            <p className="text-sm font-semibold">No results found for &ldquo;{query}&rdquo;</p>
            <p className="text-xs text-slate-400 mt-1">Check the spelling or try searching with mobile number</p>
          </div>
        )}

        {hasResults && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            {/* Invoices */}
            {invoices.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Invoices / Bills</p>
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => handleNavigate(`/bills/${inv.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{inv.invoiceNumber}</span>
                          <PaymentStatusBadge status={inv.status} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500">
                          {inv.customerName} • {inv.customerPhone} • {formatDate(inv.date)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-bold text-slate-900">{formatCurrency(inv.grandTotal)}</p>
                        {inv.pendingAmount > 0 && (
                          <p className="text-xs font-semibold text-rose-600">Pending {formatCurrency(inv.pendingAmount)}</p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Customers */}
            {customers.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Customers</p>
                {customers.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => handleNavigate(`/customers/${c.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.phone} {c.address ? `• ${c.address}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs font-medium text-slate-500">{c.totalBills} Bills</p>
                        {c.totalPending > 0 && (
                          <p className="text-xs font-bold text-rose-600">Pending {formatCurrency(c.totalPending)}</p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Products */}
            {products.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Products / Catalog</p>
                {products.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleNavigate(`/products`)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.category} • {formatCurrency(p.defaultPrice)} / {p.unit}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
