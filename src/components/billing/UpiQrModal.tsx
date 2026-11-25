"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { UpiQrPaymentCard } from "./UpiQrPaymentCard";
import { Invoice, ShopSettings } from "@/types";
import { storageService } from "@/services/storageService";

interface UpiQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  settings?: ShopSettings;
}

export function UpiQrModal({ isOpen, onClose, invoice, settings: propSettings }: UpiQrModalProps) {
  if (!invoice) return null;
  const settings = propSettings || storageService.getSettings();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={`UPI Payment QR — ${invoice.invoiceNumber}`}
    >
      <div className="flex flex-col items-center justify-center p-2">
        <UpiQrPaymentCard
          upiId={settings.upiId || "9561482326@ybl"}
          payeeName={settings.shopName || "JAI MATA DI"}
          grandTotal={invoice.grandTotal}
          paidAmount={invoice.paidAmount}
          pendingAmount={invoice.pendingAmount}
          invoiceNumber={invoice.invoiceNumber}
          customerName={invoice.customerName}
          showSummary={true}
          showActions={true}
        />
      </div>
    </Modal>
  );
}
