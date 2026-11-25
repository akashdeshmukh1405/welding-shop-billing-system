import React from "react";
import { cn } from "@/lib/utils";
import { PaymentMethod, PaymentStatus } from "@/types";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "paid" | "partial" | "pending" | "outline" | "secondary" | "cash" | "upi" | "bank" | "card";
  size?: "sm" | "md" | "lg";
}

export function Badge({ className, variant = "default", size = "md", children, ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center font-semibold rounded-full select-none tracking-tight";

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3.5 py-1.5 gap-1.5",
  };

  const variantStyles = {
    default: "bg-slate-100 text-slate-800 border border-slate-200",
    secondary: "bg-blue-50 text-blue-800 border border-blue-200",
    outline: "border border-slate-300 text-slate-700",
    paid: "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold",
    partial: "bg-amber-100 text-amber-800 border border-amber-300 font-bold",
    pending: "bg-rose-100 text-rose-800 border border-rose-300 font-bold",
    cash: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    upi: "bg-purple-50 text-purple-700 border border-purple-200",
    bank: "bg-blue-50 text-blue-700 border border-blue-200",
    card: "bg-sky-50 text-sky-700 border border-sky-200",
  };

  return (
    <span className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)} {...props}>
      {children}
    </span>
  );
}

export function PaymentStatusBadge({ status, size = "md" }: { status: PaymentStatus; size?: "sm" | "md" | "lg" }) {
  if (status === "PAID") {
    return (
      <Badge variant="paid" size={size}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
        PAID
      </Badge>
    );
  }
  if (status === "PARTIAL") {
    return (
      <Badge variant="partial" size={size}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
        PARTIAL
      </Badge>
    );
  }
  return (
    <Badge variant="pending" size={size}>
      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
      PENDING
    </Badge>
  );
}

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  const map: Record<PaymentMethod, { label: string; variant: "cash" | "upi" | "bank" | "card" | "secondary" }> = {
    CASH: { label: "Cash", variant: "cash" },
    UPI: { label: "UPI", variant: "upi" },
    BANK_TRANSFER: { label: "Bank Transfer", variant: "bank" },
    CARD: { label: "Card", variant: "card" },
    OTHER: { label: "Other", variant: "secondary" },
  };

  const item = map[method] || { label: method, variant: "secondary" };
  return (
    <Badge variant={item.variant} size="sm">
      {item.label}
    </Badge>
  );
}
