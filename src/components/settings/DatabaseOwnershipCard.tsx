"use client";

import React, { useState, useEffect } from "react";
import {
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UploadCloud,
  FileText,
  Key,
  Server,
  Lock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { storageService } from "@/services/storageService";
import { useToast } from "@/context/ToastContext";

interface DatabaseStatusInfo {
  isConfigured: boolean;
  isConnected: boolean;
  tablesVerified: boolean;
  provider: "SUPABASE_POSTGRES" | "LOCAL_OFFLINE";
  hasServiceRoleKey: boolean;
  message: string;
  details?: {
    shopSettingsCount?: number;
    invoicesCount?: number;
    customersCount?: number;
  };
}

export function DatabaseOwnershipCard() {
  const toast = useToast();
  const [status, setStatus] = useState<DatabaseStatusInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/database/status");
      const json = await res.json();
      if (json.data) {
        setStatus(json.data);
      }
    } catch (e: any) {
      toast.error("Could not fetch database connection status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSyncToSupabase = async () => {
    if (!status?.isConnected) {
      toast.error("Please configure and connect your Supabase database first.");
      return;
    }

    setIsMigrating(true);
    try {
      const payload = {
        settings: storageService.getSettings(),
        customers: storageService.getCustomers(),
        products: storageService.getProducts(),
        invoices: storageService.getInvoices(),
        payments: storageService.getPayments(),
      };

      const res = await fetch("/api/database/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        setMigrationResult(json.summary);
        toast.success(json.message || "All records safely synced to Supabase!");
        await fetchStatus();
      } else {
        toast.error(json.message || "Sync failed. Check Supabase table migrations.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Sync request failed");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Customer Ownership Guarantee Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
          <ShieldCheck className="w-4 h-4" />
          100% Customer Database Ownership
        </div>
        <h3 className="text-xl sm:text-2xl font-black tracking-tight">
          Independent PostgreSQL / Supabase Architecture
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
          This system is engineered for complete client sovereignty. The database is hosted in your own
          Supabase account. The developer holds zero ownership, zero backdoors, and no ongoing access to your business records.
        </p>

        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-start gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Customer holds primary Supabase project ownership</span>
          </div>
          <div className="flex items-start gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Row Level Security (RLS) protects all tables</span>
          </div>
          <div className="flex items-start gap-2 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Zero personal developer database dependencies</span>
          </div>
        </div>
      </div>

      {/* 2. Live Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                  status?.isConnected
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                <Server className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Database Connection & Provider Status</CardTitle>
                <CardDescription>
                  Current operational data storage mode of the POS application
                </CardDescription>
              </div>
            </div>

            <Button
              onClick={fetchStatus}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="text-xs font-bold"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
              Test Connection
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              status?.isConnected
                ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                : "bg-amber-50 border-amber-200 text-amber-950"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-3.5 h-3.5 rounded-full ${
                  status?.isConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <div>
                <p className="font-black text-sm">
                  {status?.isConnected
                    ? "Customer Supabase PostgreSQL Connected"
                    : "High-Speed Local Offline Storage (Active)"}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">{status?.message}</p>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="font-mono bg-white px-2.5 py-1 rounded-lg border border-slate-300 font-bold">
                {status?.provider || "LOCAL_OFFLINE"}
              </span>
            </div>
          </div>

          {/* Connected Table Stats if online */}
          {status?.isConnected && status.details && (
            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-500 font-medium">Invoices in Cloud</p>
                <p className="text-base font-black text-slate-900 mt-0.5">{status.details.invoicesCount}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-500 font-medium">Customers in Cloud</p>
                <p className="text-base font-black text-slate-900 mt-0.5">{status.details.customersCount}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-500 font-medium">Service Role</p>
                <p className="text-base font-black text-emerald-700 mt-0.5">
                  {status.hasServiceRoleKey ? "Configured" : "Anon Only"}
                </p>
              </div>
            </div>
          )}

          {/* Sync Local Data Button */}
          <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-900 text-sm">Migrate / Sync Local Records to Supabase</p>
              <p className="text-xs text-slate-500">
                Safely copy all invoices, customers, and payments from your local device directly into your customer Supabase project.
              </p>
            </div>
            <Button
              onClick={handleSyncToSupabase}
              variant="primary"
              size="md"
              disabled={!status?.isConnected || isMigrating}
              isLoading={isMigrating}
              className="bg-blue-600 hover:bg-blue-700 font-bold shrink-0 text-xs"
            >
              <UploadCloud className="w-4 h-4 mr-1.5" />
              Sync Local Records to Cloud
            </Button>
          </div>

          {migrationResult && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 space-y-1">
              <p className="font-bold">Sync Completed Successfully:</p>
              <p>
                {migrationResult.invoicesMigrated} Invoices, {migrationResult.customersMigrated} Customers,{" "}
                {migrationResult.paymentsMigrated} Payments, {migrationResult.productsMigrated} Products synchronized.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Customer Handover Configuration Guide */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-black">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Connecting Your Own Supabase Account</CardTitle>
              <CardDescription>
                How the business owner configures their own database in 3 simple steps
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-slate-700">
          <ol className="list-decimal list-inside space-y-2 leading-relaxed">
            <li>
              <strong>Create Free Account:</strong> Sign up at{" "}
              <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 font-bold underline">
                supabase.com
              </a>{" "}
              and create a new project named <code>jay-mata-di-billing</code>.
            </li>
            <li>
              <strong>Run Migrations:</strong> In Supabase SQL Editor, run the provided SQL scripts in{" "}
              <code>supabase/migrations/</code> to automatically create all 8 tables and Row Level Security rules.
            </li>
            <li>
              <strong>Add Credentials to .env.local:</strong> Copy Project URL and API Keys into your server environment:
              <div className="my-2 p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto space-y-1">
                <p>NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"</p>
                <p>NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsIn..."</p>
                <p>SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsIn..."</p>
              </div>
            </li>
          </ol>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 flex items-center justify-between flex-wrap gap-2">
            <span>Detailed step-by-step instructions are available in <strong>SUPABASE_SETUP.md</strong> and <strong>CUSTOMER_HANDOVER_GUIDE.md</strong>.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
