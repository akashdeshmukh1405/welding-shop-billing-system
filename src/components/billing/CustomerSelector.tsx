"use client";

import React, { useState, useEffect } from "react";
import {
  User,
  Phone,
  MapPin,
  Building,
  CheckCircle2,
  Users,
  AlertTriangle,
  PlusCircle,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Customer, LinkedFamilyContact } from "@/types";
import { storageService } from "@/services/storageService";
import { customerService } from "@/services/customerService";
import { formatCurrency, isValidIndianMobile } from "@/lib/utils";

interface CustomerSelectorProps {
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerGst?: string;
  linkedFamilyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  onCustomerChange: (data: {
    customerId?: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    customerGst?: string;
    linkedFamilyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  }) => void;
  errors?: {
    customerName?: string;
    customerPhone?: string;
  };
}

export function CustomerSelector({
  customerId,
  customerName,
  customerPhone,
  customerAddress,
  customerGst,
  linkedFamilyContact,
  onCustomerChange,
  errors,
}: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [detectedAccount, setDetectedAccount] = useState<{
    customer: Customer;
    matchedVia: "PRIMARY" | "FAMILY";
    matchedContact?: LinkedFamilyContact;
  } | null>(null);
  const [isConfirmedToExisting, setIsConfirmedToExisting] = useState(false);
  const [showFamilyLinkBox, setShowFamilyLinkBox] = useState(false);
  const [familyName, setFamilyName] = useState(linkedFamilyContact?.name || "");
  const [familyPhone, setFamilyPhone] = useState(linkedFamilyContact?.phone || "");
  const [familyRelation, setFamilyRelation] = useState(linkedFamilyContact?.relationship || "Son");

  useEffect(() => {
    setCustomers(storageService.getCustomers());
  }, []);

  // When phone changes, search by primary or family phone
  const handlePhoneChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 10);

    if (raw.length === 10) {
      const match = customerService.searchCustomerByAnyPhone(raw);
      if (match) {
        setDetectedAccount(match);
        // By default, auto-populate customer details but ask confirmation
        onCustomerChange({
          customerId: match.customer.id,
          customerName: match.customer.name,
          customerPhone: raw,
          customerAddress: match.customer.address || customerAddress,
          customerGst: match.customer.gstNumber || customerGst,
          linkedFamilyContact: linkedFamilyContact,
        });
        setIsConfirmedToExisting(true);
        return;
      }
    }

    setDetectedAccount(null);
    setIsConfirmedToExisting(false);
    onCustomerChange({
      customerId: undefined,
      customerName,
      customerPhone: raw,
      customerAddress,
      customerGst,
      linkedFamilyContact: linkedFamilyContact,
    });
  };

  const handleSelectExisting = (cust: Customer) => {
    setDetectedAccount({ customer: cust, matchedVia: "PRIMARY" });
    setIsConfirmedToExisting(true);
    onCustomerChange({
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      customerAddress: cust.address || "",
      customerGst: cust.gstNumber || "",
      linkedFamilyContact: linkedFamilyContact,
    });
    setShowSuggestions(false);
  };

  const handleConfirmExisting = () => {
    if (!detectedAccount) return;
    setIsConfirmedToExisting(true);
    onCustomerChange({
      customerId: detectedAccount.customer.id,
      customerName: detectedAccount.customer.name,
      customerPhone: customerPhone || detectedAccount.customer.phone,
      customerAddress: detectedAccount.customer.address || customerAddress,
      customerGst: detectedAccount.customer.gstNumber || customerGst,
      linkedFamilyContact: linkedFamilyContact,
    });
  };

  const handleDeclineExisting = () => {
    // Treat as separate customer account
    setIsConfirmedToExisting(false);
    setDetectedAccount(null);
    onCustomerChange({
      customerId: undefined,
      customerName: customerName,
      customerPhone: customerPhone,
      customerAddress,
      customerGst,
      linkedFamilyContact: undefined,
    });
  };

  const handleSaveFamilyLink = () => {
    if (!familyName.trim() || !familyPhone.trim()) return;
    const cleanPhone = familyPhone.replace(/\D/g, "").slice(0, 10);
    const linkData = {
      name: familyName.trim(),
      phone: cleanPhone,
      relationship: familyRelation.trim() || "Son",
    };
    onCustomerChange({
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      customerGst,
      linkedFamilyContact: linkData,
    });
    setShowFamilyLinkBox(false);
  };

  const filteredSuggestions =
    customerName.trim().length >= 2
      ? customers
          .filter(
            (c) =>
              c.name.toLowerCase().includes(customerName.toLowerCase()) ||
              c.phone.includes(customerName) ||
              (c.familyContacts &&
                c.familyContacts.some(
                  (f) =>
                    f.name.toLowerCase().includes(customerName.toLowerCase()) ||
                    f.phone.includes(customerName)
                ))
          )
          .slice(0, 4)
      : [];

  return (
    <div className="space-y-4">
      {/* Detected Existing Account Banner */}
      {detectedAccount && (
        <div className="p-4 bg-blue-50/90 border-2 border-blue-300 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0 shadow-md">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-blue-950 text-sm sm:text-base">
                  Existing Account: {detectedAccount.customer.name}
                </p>
                <p className="text-xs text-blue-800">
                  Primary Mobile: +91 {detectedAccount.customer.phone} • {detectedAccount.customer.totalBills} previous bills
                </p>
                {detectedAccount.matchedVia === "FAMILY" && detectedAccount.matchedContact && (
                  <p className="text-xs font-bold text-amber-900 mt-0.5">
                    ℹ️ Matched via linked family contact: {detectedAccount.matchedContact.name} ({detectedAccount.matchedContact.relationship} - +91 {detectedAccount.matchedContact.phone})
                  </p>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs font-bold text-slate-500 uppercase">Outstanding Balance</p>
              <p
                className={`text-lg font-black ${
                  detectedAccount.customer.totalPending > 0 ? "text-rose-600" : "text-emerald-700"
                }`}
              >
                {formatCurrency(detectedAccount.customer.totalPending)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-blue-200">
            {isConfirmedToExisting ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Bill will be added to {detectedAccount.customer.name}&apos;s customer ledger.
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleDeclineExisting}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  Create as Separate Account
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={handleConfirmExisting}
                  className="text-xs font-bold bg-blue-700 hover:bg-blue-800"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Confirm: Add to {detectedAccount.customer.name}&apos;s Account
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleDeclineExisting}
                  className="text-xs"
                >
                  Create Separate Customer
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Name with Autocomplete */}
        <div className="relative">
          <Input
            label="Customer Name"
            placeholder="e.g. Ramesh Patil"
            required
            value={customerName}
            leftIcon={<User className="w-4 h-4" />}
            error={errors?.customerName}
            onChange={(e) => {
              onCustomerChange({
                customerId,
                customerName: e.target.value,
                customerPhone,
                customerAddress,
                customerGst,
                linkedFamilyContact,
              });
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
          />

          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden divide-y divide-slate-100">
              <div className="p-2 bg-slate-50 text-[11px] font-bold text-slate-400 uppercase">
                Matching Customer Accounts
              </div>
              {filteredSuggestions.map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => handleSelectExisting(cust)}
                  className="p-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <p className="font-bold text-sm text-slate-900">{cust.name}</p>
                    <p className="text-xs text-slate-500">
                      +91 {cust.phone} {cust.address ? `• ${cust.address}` : ""}
                    </p>
                    {cust.familyContacts && cust.familyContacts.length > 0 && (
                      <p className="text-[11px] text-blue-600 font-medium">
                        Linked: {cust.familyContacts.map((f) => `${f.name} (${f.relationship})`).join(", ")}
                      </p>
                    )}
                  </div>
                  {cust.totalPending > 0 ? (
                    <span className="text-xs font-semibold text-rose-600">
                      Due {formatCurrency(cust.totalPending)}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600">All Paid</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Mobile */}
        <div>
          <Input
            label="Mobile Number (Primary / WhatsApp)"
            placeholder="98XXXXXXXX"
            type="tel"
            maxLength={10}
            required
            prefixText="+91"
            value={customerPhone}
            leftIcon={<Phone className="w-4 h-4" />}
            error={errors?.customerPhone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            helperText="10-digit mobile number for WhatsApp invoice & ledger"
          />
        </div>

        {/* Optional Address */}
        <div>
          <Input
            label="Site / Delivery Address (Optional)"
            placeholder="e.g. Naggaon Road, Bodwad"
            value={customerAddress || ""}
            leftIcon={<MapPin className="w-4 h-4" />}
            onChange={(e) =>
              onCustomerChange({
                customerId,
                customerName,
                customerPhone,
                customerAddress: e.target.value,
                customerGst,
                linkedFamilyContact,
              })
            }
          />
        </div>

        {/* Optional GSTIN */}
        <div>
          <Input
            label="GSTIN Number (Optional)"
            placeholder="e.g. 27AABCP1111A1Z1"
            value={customerGst || ""}
            leftIcon={<Building className="w-4 h-4" />}
            onChange={(e) =>
              onCustomerChange({
                customerId,
                customerName,
                customerPhone,
                customerAddress,
                customerGst: e.target.value.toUpperCase(),
                linkedFamilyContact,
              })
            }
          />
        </div>
      </div>

      {/* Optional Linked Family Member Contact (e.g. Son or Relative visiting) */}
      <div className="pt-1">
        {!showFamilyLinkBox && !linkedFamilyContact ? (
          <button
            type="button"
            onClick={() => setShowFamilyLinkBox(true)}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            + Link Family Member / Shared Contact (e.g. Son, Brother, Wife visiting)
          </button>
        ) : (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Linked Family Member Details
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowFamilyLinkBox(false);
                  onCustomerChange({
                    customerId,
                    customerName,
                    customerPhone,
                    customerAddress,
                    customerGst,
                    linkedFamilyContact: undefined,
                  });
                }}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Family Member Name"
                placeholder="e.g. Rahul Patil"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Relationship
                </label>
                <select
                  value={familyRelation}
                  onChange={(e) => setFamilyRelation(e.target.value)}
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
                label="Family Member Mobile"
                placeholder="98XXXXXXXX"
                type="tel"
                maxLength={10}
                value={familyPhone}
                onChange={(e) => setFamilyPhone(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={handleSaveFamilyLink}
                className="text-xs font-bold"
              >
                Save Family Contact
              </Button>
            </div>
          </div>
        )}

        {linkedFamilyContact && (
          <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800">
            <span>
              ✓ Linked Contact: <strong>{linkedFamilyContact.name}</strong> ({linkedFamilyContact.relationship}) - +91 {linkedFamilyContact.phone}
            </span>
            <button
              type="button"
              onClick={() =>
                onCustomerChange({
                  customerId,
                  customerName,
                  customerPhone,
                  customerAddress,
                  customerGst,
                  linkedFamilyContact: undefined,
                })
              }
              className="text-rose-600 hover:underline font-bold"
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
