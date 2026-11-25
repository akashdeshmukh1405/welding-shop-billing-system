import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Single centralized Indian Rupee currency formatter.
 * formatCurrency(16800) -> "₹16,800"
 * formatCurrency(116800) -> "₹1,16,800"
 * formatCurrency(0) -> "₹0"
 */
export function formatCurrency(amount: number | undefined | null, showSymbol = true): string {
  const numeric = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
  }).format(numeric);

  return showSymbol ? `₹${formatted}` : formatted;
}

/**
 * Plain numeric formatted string without currency symbol, for ASCII / PDF text streams
 * formatAmount(16800) -> "16,800"
 */
export function formatAmount(amount: number | undefined | null): string {
  return formatCurrency(amount, false);
}

/**
 * Consistent date formatting e.g. "02 Sep 2026"
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(d.getDate()).padStart(2, "0");
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return dateString;
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidIndianMobile(phone: string): boolean {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length === 10 && /^[6-9]\d{9}$/.test(cleanPhone)) {
    return true;
  }
  if (cleanPhone.length === 12 && /^91[6-9]\d{9}$/.test(cleanPhone)) {
    return true;
  }
  return false;
}

export function sanitizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) return cleaned;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned.slice(2);
  return phone;
}
