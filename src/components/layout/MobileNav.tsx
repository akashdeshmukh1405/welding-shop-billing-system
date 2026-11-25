"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Clock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { storageService } from "@/services/storageService";

export function MobileNav() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const updateStats = () => {
      const invoices = storageService.getInvoices();
      const count = invoices.filter((i) => i.pendingAmount > 0).length;
      setPendingCount(count);
    };

    updateStats();
    window.addEventListener("storage", updateStats);
    const interval = setInterval(updateStats, 3000);
    return () => {
      window.removeEventListener("storage", updateStats);
      clearInterval(interval);
    };
  }, []);

  const items = [
    {
      label: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      active: pathname === "/",
    },
    {
      label: "Bills",
      href: "/bills",
      icon: Receipt,
      active: pathname.startsWith("/bills") && pathname !== "/bills/new",
    },
    {
      label: "New Bill",
      href: "/bills/new",
      icon: PlusCircle,
      active: pathname === "/bills/new",
      isFab: true,
    },
    {
      label: "Pending",
      href: "/pending",
      icon: Clock,
      active: pathname === "/pending",
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      label: "Customers",
      href: "/customers",
      icon: Users,
      active: pathname.startsWith("/customers"),
    },
  ];

  return (
    <nav className="ipad:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 flex items-center justify-around select-none no-print">
      {items.map((item) => {
        const Icon = item.icon;

        if (item.isFab) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center -mt-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-transform">
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-blue-700 mt-0.5">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center py-1 px-3 rounded-xl min-w-[56px] transition-colors relative",
              item.active ? "text-blue-600 font-bold" : "text-slate-500 hover:text-slate-900"
            )}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500 text-white min-w-[16px] text-center leading-tight">
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-1">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
