"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { InvoicePrintSheet } from "@/components/billing/InvoicePrintSheet";
import { invoiceService } from "@/services/invoiceService";
import { storageService } from "@/services/storageService";
import { Invoice, ShopSettings } from "@/types";

export default function PrintInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<ShopSettings>(storageService.getSettings());

  useEffect(() => {
    const inv = invoiceService.getInvoiceById(id);
    if (inv) {
      setInvoice(inv);
      setSettings(storageService.getSettings());
    } else {
      router.push("/bills");
    }
  }, [id, router]);

  if (!invoice) return null;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8">
      <InvoicePrintSheet
        invoice={invoice}
        settings={settings}
        onBack={() => router.push(`/bills/${invoice.id}`)}
      />
    </div>
  );
}
