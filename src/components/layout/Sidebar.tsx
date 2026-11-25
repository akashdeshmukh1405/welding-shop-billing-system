"use client";

import React, { useEffect, useState } from "react";
import Link from "next/navigation";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Clock,
  Users,
  Package,
  History,
  BarChart3,
  Settings,
  Flame,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { storageService } from "@/services/storageService";
import { ShopSettings } from "@/types";

export function Sidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);

  useEffect(() => {
    const updateStats = () => {
      const invoices = storageService.getInvoices();
      const count = invoices.filter((i) => i.pendingAmount > 0).length;
      setPendingCount(count);
      setShopSettings(storageService.getSettings());
    };

    updateStats();
    window.addEventListener("storage", updateStats);
    const interval = setInterval(updateStats, 3000);
    return () => {
      window.removeEventListener("storage", updateStats);
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    {
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      label: "New Bill",
      href: "/bills/new",
      icon: PlusCircle,
      active: pathname === "/bills/new",
      highlight: true,
    },
    {
      label: "Bills & Invoices",
      href: "/bills",
      icon: Receipt,
      active: pathname.startsWith("/bills") && pathname !== "/bills/new",
    },
    {
      label: "Pending Payments",
      href: "/pending",
      icon: Clock,
      active: pathname === "/pending",
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: "bg-rose-500 text-white",
    },
    {
      label: "Customers",
      href: "/customers",
      icon: Users,
      active: pathname.startsWith("/customers"),
    },
    {
      label: "Products Catalog",
      href: "/products",
      icon: Package,
      active: pathname === "/products",
    },
    {
      label: "Payment History",
      href: "/payments",
      icon: History,
      active: pathname === "/payments",
    },
    {
      label: "Reports & Sales",
      href: "/reports",
      icon: BarChart3,
      active: pathname === "/reports",
    },
    {
      label: "Shop Settings",
      href: "/settings",
      icon: Settings,
      active: pathname === "/settings",
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex-shrink-0 hidden ipad:flex flex-col border-r border-slate-800 select-none no-print">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-orange-500/20">
          <Flame className="w-6 h-6 text-slate-950" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-bold text-sm text-white tracking-tight truncate leading-tight">
            {shopSettings?.shopName || "Welding Shop POS"}
          </h1>
          <p className="text-[11px] text-slate-400 font-medium truncate mt-0.5">
            Billing & Ledger System
          </p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 group",
                item.active
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : item.highlight
                  ? "bg-slate-800/80 text-amber-400 hover:bg-slate-800 hover:text-amber-300 border border-amber-500/20"
                  : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "w-5 h-5 transition-transform group-hover:scale-105",
                    item.active
                      ? "text-white"
                      : item.highlight
                      ? "text-amber-400"
                      : "text-slate-400 group-hover:text-slate-200"
                  )}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-bold",
                    item.badgeColor || "bg-slate-700 text-slate-300"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}
      </nav>

      {/* Quick Tablet Helper Box & Logout */}
      <div className="p-3 m-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 text-xs text-slate-400 space-y-2">
        <div className="flex items-center justify-between text-slate-300 font-semibold">
          <span>POS Status</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        </div>
        <p className="text-[11px] text-slate-400">
          Fast touch billing for iPad & Tablet.
        </p>

        <button
          onClick={async () => {
            try {
              await fetch("/api/auth/logout", { method: "POST" });
            } catch {}
            window.location.href = "/login";
          }}
          className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/50 hover:border-rose-800/50 transition-all font-bold text-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
