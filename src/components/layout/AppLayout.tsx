"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";
import { X, Flame } from "lucide-react";
import Link from "next/link";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // On auth / login screens, render full-page standalone view without sidebar/header
  if (pathname === "/login") {
    return <div className="min-h-screen w-full">{children}</div>;
  }

  const mobileNavLinks = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "New Bill", href: "/bills/new", icon: PlusCircle },
    { label: "All Bills", href: "/bills", icon: Receipt },
    { label: "Pending Payments", href: "/pending", icon: Clock },
    { label: "Customers", href: "/customers", icon: Users },
    { label: "Products Catalog", href: "/products", icon: Package },
    { label: "Payment History", href: "/payments", icon: History },
    { label: "Reports & Sales", href: "/reports", icon: BarChart3 },
    { label: "Shop Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-row">
      {/* Desktop / iPad Sidebar */}
      <Sidebar />

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 ipad:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 bg-slate-900 text-white flex flex-col p-4 z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm">Welding POS</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
              {mobileNavLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors",
                      isActive ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 ipad:pb-0">
        <Header onMobileMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
