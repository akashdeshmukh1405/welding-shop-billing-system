"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, PlusCircle, Calendar, Flame, Menu, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { GlobalSearchModal } from "@/components/common/GlobalSearchModal";
import { storageService } from "@/services/storageService";
import { ShopSettings } from "@/types";
import { formatDate } from "@/lib/utils";

export function Header({ onMobileMenuClick }: { onMobileMenuClick?: () => void }) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const todayDate = new Date().toISOString();

  useEffect(() => {
    setSettings(storageService.getSettings());

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network errors on logout
    }
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      <header className="h-16 sm:h-20 bg-white border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between gap-3 sticky top-0 z-30 select-none no-print">
        {/* Left: Mobile menu trigger & Shop Title */}
        <div className="flex items-center gap-3 min-w-0">
          {onMobileMenuClick && (
            <button
              onClick={onMobileMenuClick}
              className="ipad:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              aria-label="Open navigation menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          )}

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="ipad:hidden w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold flex-shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-slate-900 text-base sm:text-lg truncate leading-tight">
                {settings?.shopName || "JAI MATA DI"}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-amber-800">{settings?.businessCategory || "STEEL FURNITURE & RAILING"}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline font-mono">{settings?.shopPhone ? `Ph: ${settings.shopPhone}` : ""}</span>
                <span className="hidden sm:inline">•</span>
                <span className="inline-flex items-center gap-1 font-medium text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formatDate(todayDate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* Quick Search Button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 text-slate-600 text-sm font-medium transition-colors border border-slate-200/60"
            title="Search (Ctrl + K)"
          >
            <Search className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline text-slate-500">Search bills, customer, mobile...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded">
              Ctrl K
            </kbd>
          </button>

          {/* Large prominent touch New Bill button */}
          <Button
            onClick={() => router.push("/bills/new")}
            variant="primary"
            size="md"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-bold shadow-md shadow-blue-500/20"
          >
            <PlusCircle className="w-5 h-5" />
            <span className="hidden sm:inline">Create New Bill</span>
            <span className="sm:hidden">New Bill</span>
          </Button>

          {/* Shop Owner Logout Button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors border border-slate-200"
            title="Log out of Shop"
          >
            <LogOut className="w-4 h-4 text-slate-500 hover:text-rose-600" />
            <span className="hidden xl:inline">{isLoggingOut ? "..." : "Logout"}</span>
          </button>
        </div>
      </header>

      {/* Global Search Dialog */}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
