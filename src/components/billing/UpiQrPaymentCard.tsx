"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  QrCode,
  CheckCircle2,
  Smartphone,
  Download,
  Printer,
  ShieldAlert,
  IndianRupee,
  Receipt,
  User,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { generateUpiQrDataUrl } from "@/lib/upiUtils";
import { Button } from "@/components/ui/Button";

interface UpiQrPaymentCardProps {
  upiId?: string;
  payeeName?: string;
  grandTotal: number;
  paidAmount: number;
  pendingAmount: number;
  invoiceNumber: string;
  customerName?: string;
  compact?: boolean;
  showSummary?: boolean;
  showActions?: boolean;
}

export function UpiQrPaymentCard({
  upiId = "9561482326@ybl",
  payeeName = "JAI MATA DI",
  grandTotal,
  paidAmount,
  pendingAmount,
  invoiceNumber,
  customerName,
  compact = false,
  showSummary = true,
  showActions = true,
}: UpiQrPaymentCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Exact remaining payable amount for dynamic QR code
  const amountToPay = Math.max(0, pendingAmount);
  const isSettled = amountToPay <= 0;
  const isUnpaid = paidAmount === 0 || amountToPay === grandTotal;

  useEffect(() => {
    if (!upiId) {
      setQrDataUrl("");
      return;
    }

    let isMounted = true;

    // Rule 1 & 2: For unpaid/partial, QR amount = pending balance.
    // Rule 3: For fully paid invoices, display shop's static UPI QR without a payment amount.
    const upiParams = isSettled
      ? {
          upiId,
          payeeName,
          invoiceNumber,
          note: `Shop UPI - ${payeeName}`,
        }
      : {
          upiId,
          payeeName,
          amount: amountToPay,
          invoiceNumber,
          note: `Bill ${invoiceNumber} Balance Due - ${payeeName}`,
        };

    generateUpiQrDataUrl(upiParams).then((url) => {
      if (isMounted) setQrDataUrl(url);
    });

    return () => {
      isMounted = false;
    };
  }, [upiId, payeeName, amountToPay, invoiceNumber, isSettled]);

  if (!upiId) return null;

  // Download QR Code PNG
  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = isSettled
      ? `QR_${invoiceNumber}_Static_Shop.png`
      : `QR_${invoiceNumber}_Remaining_${amountToPay}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Print standalone QR card
  const handlePrintQr = () => {
    const printWindow = window.open("", "_blank", "width=600,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>UPI Payment QR - ${invoiceNumber}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; text-align: center; padding: 24px; color: #0f172a; }
            .card { max-width: 380px; margin: 0 auto; border: 2px solid #0f172a; border-radius: 16px; padding: 20px; }
            h2 { margin: 0 0 4px 0; font-size: 20px; }
            .sub { color: #b45309; font-weight: bold; margin-bottom: 12px; font-size: 13px; }
            .details { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; text-align: left; font-size: 13px; margin: 12px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .amount { font-size: 22px; font-weight: 900; color: ${isSettled ? "#047857" : "#b91c1c"}; margin: 10px 0; }
            .badge { display: inline-block; background: #dcfce7; color: #166534; font-weight: 900; font-size: 13px; padding: 4px 12px; border-radius: 9999px; border: 1px solid #86efac; margin-bottom: 8px; }
            img { width: 200px; height: 200px; margin: 8px 0; border: 1px solid #cbd5e1; border-radius: 12px; padding: 8px; }
            .upi { font-family: monospace; font-size: 13px; font-weight: bold; background: #f1f5f9; padding: 6px; border-radius: 8px; }
            .notice { font-size: 10px; color: #64748b; margin-top: 12px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>${payeeName}</h2>
            <div class="sub">STEEL FURNITURE & RAILING</div>
            
            ${isSettled ? `<div class="badge">PAID – NO PAYMENT DUE</div>` : ""}

            <div class="details">
              <div class="row"><span><strong>Invoice:</strong></span><span>#${invoiceNumber}</span></div>
              ${customerName ? `<div class="row"><span><strong>Customer:</strong></span><span>${customerName}</span></div>` : ""}
              <div class="row"><span>Total Bill:</span><span>₹${grandTotal.toLocaleString("en-IN")}</span></div>
              <div class="row"><span>Amount Paid:</span><span style="color: #047857;">₹${paidAmount.toLocaleString("en-IN")}</span></div>
              <div class="row" style="border-top: 1px solid #cbd5e1; padding-top: 6px; font-weight: bold;">
                <span>${isSettled ? "Status:" : "Remaining Balance:"}</span>
                <span style="color: ${isSettled ? "#047857" : "#b91c1c"};">
                  ${isSettled ? "PAID IN FULL" : `₹${amountToPay.toLocaleString("en-IN")}`}
                </span>
              </div>
            </div>

            <img src="${qrDataUrl}" alt="UPI QR" />
            <div class="amount">
              ${isSettled ? "PAID – NO PAYMENT DUE" : `Scan to Pay ₹${amountToPay.toLocaleString("en-IN")}`}
            </div>
            <div class="upi">UPI ID: ${upiId}</div>
            <p class="notice">Works with PhonePe, Google Pay, Paytm, BHIM & All UPI Apps.<br>
              ${isSettled ? "Account fully settled. Shop UPI QR for records." : "Confirm payment with shopkeeper upon scanning."}
            </p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div
      ref={printContainerRef}
      className={`bg-white rounded-2xl border-2 ${
        isSettled ? "border-emerald-500 bg-emerald-50/10" : "border-slate-900"
      } shadow-sm p-4 text-center select-none ${compact ? "max-w-[260px]" : "w-full"}`}
    >
      {/* Prominent PAID – NO PAYMENT DUE Banner on fully paid invoices (Rule 4) */}
      {isSettled && (
        <div className="mb-3 py-1.5 px-3 bg-emerald-100 border-2 border-emerald-500 rounded-xl flex items-center justify-center gap-1.5 text-emerald-900 font-black text-xs tracking-wide">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>PAID – NO PAYMENT DUE</span>
        </div>
      )}

      {/* 1. Header with Invoice and Customer Info */}
      <div className="pb-2 border-b border-slate-200 text-left space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {isSettled ? "Shop UPI QR" : "Payment QR"}
          </span>
          <span className="font-mono text-xs font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            #{invoiceNumber}
          </span>
        </div>
        {customerName && (
          <p className="text-xs font-bold text-slate-800 flex items-center gap-1 truncate">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">{customerName}</span>
          </p>
        )}
      </div>

      {/* 2. Financial Summary Breakdown */}
      {showSummary && (
        <div className="text-xs space-y-1 py-2.5 border-b border-slate-200 text-left">
          <div className="flex justify-between text-slate-600 font-semibold">
            <span>Total Bill:</span>
            <span className="font-bold text-slate-900">{formatCurrency(grandTotal)}</span>
          </div>
          <div className="flex justify-between text-emerald-700 font-semibold">
            <span>Advance / Paid:</span>
            <span className="font-bold">{formatCurrency(paidAmount)}</span>
          </div>
          <div
            className={`flex justify-between pt-1 border-t border-slate-100 text-sm font-black ${
              isSettled ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            <span>{isSettled ? "Status:" : "Balance to Pay:"}</span>
            <span className="text-base font-black">
              {isSettled ? "PAID IN FULL" : formatCurrency(amountToPay)}
            </span>
          </div>
        </div>
      )}

      {/* 3. QR Code Display */}
      <div className="my-2.5 flex flex-col items-center justify-center">
        {qrDataUrl ? (
          <div className="relative p-2.5 bg-white rounded-xl border border-slate-300 shadow-inner">
            <img
              src={qrDataUrl}
              alt={isSettled ? "PAID - NO PAYMENT DUE (Shop UPI QR)" : `Scan UPI QR to Pay ${formatCurrency(amountToPay)}`}
              className="w-36 h-36 sm:w-40 sm:h-40 object-contain mx-auto"
            />
          </div>
        ) : (
          <div className="w-36 h-36 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
            <QrCode className="w-8 h-8 animate-pulse" />
          </div>
        )}
      </div>

      {/* 4. UPI Details & Instructions */}
      <div className="space-y-1.5 text-slate-900">
        <p className="text-xs font-mono font-black tracking-tight bg-slate-100 py-1.5 px-2 rounded-lg border border-slate-200 break-all">
          UPI ID: <span className="text-blue-700 font-bold">{upiId}</span>
        </p>

        <div>
          {isSettled ? (
            <div>
              <p className="text-sm font-black text-emerald-700 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>PAID – NO PAYMENT DUE</span>
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                Shop Static UPI QR Code (Settled)
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-black text-rose-700 flex items-center justify-center gap-1">
                <Smartphone className="w-4 h-4 text-rose-600" />
                <span>Scan to Pay {formatCurrency(amountToPay)}</span>
              </p>
              <p className="text-[10px] text-slate-500 font-medium">
                PhonePe • Google Pay • Paytm • BHIM UPI
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 5. Download & Print Actions */}
      {showActions && qrDataUrl && (
        <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadQr}
            className="text-xs font-bold h-8 px-2.5 text-slate-700 border-slate-300 hover:bg-slate-100"
            title="Download QR Image"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Download QR
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrintQr}
            className="text-xs font-bold h-8 px-2.5 text-slate-700 border-slate-300 hover:bg-slate-100"
            title="Print UPI QR Receipt"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Print QR
          </Button>
        </div>
      )}

      {/* 6. Security Confirmation Notice (Only on management dashboard/actions) */}
      {showActions && (
        <div className="mt-2.5 p-2 bg-amber-50/80 rounded-xl border border-amber-200 text-[10px] text-amber-900 text-left flex items-start gap-1.5 leading-snug">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Payment Security:</strong> Scanning QR generates payment intent. Always verify credit in your bank app before clicking &quot;Collect Payment&quot; to update invoice records.
          </span>
        </div>
      )}
    </div>
  );
}
