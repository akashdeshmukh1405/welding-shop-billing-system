"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Store,
  FileText,
  CreditCard,
  RotateCcw,
  Download,
  Upload,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Database,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ExcelBackupRestoreCenter } from "@/components/backup/ExcelBackupRestoreCenter";
import { DatabaseOwnershipCard } from "@/components/settings/DatabaseOwnershipCard";
import { settingsService } from "@/services/settingsService";
import { useToast } from "@/context/ToastContext";
import { ShopSettings } from "@/types";

import { initialShopSettings } from "@/lib/seedData";

export default function SettingsPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"profile" | "backup" | "database">("profile");
  const [settings, setSettings] = useState<ShopSettings>(initialShopSettings);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  useEffect(() => {
    setSettings(settingsService.getSettings());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.shopName.trim()) {
      toast.error("Shop name is required");
      return;
    }
    if (!settings.shopPhone.trim()) {
      toast.error("Shop phone is required");
      return;
    }

    settingsService.updateSettings(settings);
    toast.success("Shop settings saved successfully!");
  };

  const handleResetData = () => {
    settingsService.resetToDemoData();
    toast.success("Reset all database items to default shop data");
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Shop Settings & Data Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage workshop profile, printable invoice header, logo, and Excel database backups
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1 text-xs font-bold self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "profile" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Store className="w-4 h-4 text-blue-600" />
            Workshop Profile
          </button>
          <button
            onClick={() => setActiveTab("backup")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "backup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Excel Backup & Reports
          </button>
          <button
            onClick={() => setActiveTab("database")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "database" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Database className="w-4 h-4 text-purple-600" />
            Database & Cloud Ownership
          </button>
        </div>
      </div>

      {/* TAB 1: WORKSHOP PROFILE */}
      {activeTab === "profile" && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Shop Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-blue-600" />
                <div>
                  <CardTitle>Workshop Identity & Branding</CardTitle>
                  <CardDescription>Appears prominently on invoice headers, printable bills, and WhatsApp documents</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Traditional Header"
                  value={settings.headerTradition || "|| Shree ||"}
                  onChange={(e) => setSettings({ ...settings, headerTradition: e.target.value })}
                  helperText="e.g. || Shree ||"
                />
                <Input
                  label="Business Name"
                  required
                  value={settings.shopName}
                  onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
                  helperText="e.g. JAI MATA DI"
                />
                <Input
                  label="Business Category / Subtitle"
                  value={settings.businessCategory || "STEEL FURNITURE & RAILING"}
                  onChange={(e) => setSettings({ ...settings, businessCategory: e.target.value })}
                  helperText="e.g. STEEL FURNITURE & RAILING"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Owner Name (Mr. Vaibhav Wagh)"
                  required
                  value={settings.ownerName}
                  onChange={(e) => setSettings({ ...settings, ownerName: e.target.value })}
                  helperText="e.g. Mr. Vaibhav Wagh"
                />
                <Input
                  label="Primary Phone / Mobile"
                  required
                  value={settings.shopPhone}
                  onChange={(e) => setSettings({ ...settings, shopPhone: e.target.value })}
                  helperText="e.g. 9561482326"
                />
              </div>

              <Input
                label="Shop Address"
                required
                value={settings.shopAddress}
                onChange={(e) => setSettings({ ...settings, shopAddress: e.target.value })}
                helperText="e.g. Naggaon Road, Bodwad, Dist. Jalgaon"
              />

              {/* Logo / Branding Image */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-500 flex-shrink-0 bg-slate-900 flex items-center justify-center">
                    {settings.logoUrl ? (
                      <img src={settings.logoUrl} alt="Shop Logo" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Shop Logo / Branding Badge</p>
                    <p className="text-xs text-slate-500">Configured as Jai Mata Di badge</p>
                  </div>
                </div>

                <div className="flex-1 max-w-sm">
                  <Input
                    label="Logo Path / URL"
                    value={settings.logoUrl || ""}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    placeholder="/branding/jaimatadi-logo.jpg"
                  />
                </div>
              </div>

              {/* Optional Fields Notice */}
              <div className="pt-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Optional Fields (Only displayed on bill if filled)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Alternate Phone (Optional)"
                    value={settings.altPhone || ""}
                    onChange={(e) => setSettings({ ...settings, altPhone: e.target.value })}
                    placeholder="Optional"
                  />
                  <Input
                    label="Shop GSTIN (Optional)"
                    value={settings.gstNumber || ""}
                    onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value.toUpperCase() })}
                    placeholder="Optional"
                  />
                  <Input
                    label="Email Address (Optional)"
                    type="email"
                    value={settings.email || ""}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Format & Prefix */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <div>
                  <CardTitle>Invoice Numbering & Message</CardTitle>
                  <CardDescription>Configure prefix, sequence number, and thank you message</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Invoice Prefix"
                  required
                  value={settings.invoicePrefix}
                  onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                  helperText="e.g. INV-"
                />
                <Input
                  label="Starting Sequence Number"
                  type="number"
                  min="1"
                  required
                  value={settings.invoiceStartingNumber}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      invoiceStartingNumber: parseInt(e.target.value, 10) || 1001,
                    })
                  }
                  helperText="e.g. 1001"
                />
              </div>

              <Input
                label="Invoice Footer Note / Greeting"
                value={settings.invoiceFooterMessage}
                onChange={(e) => setSettings({ ...settings, invoiceFooterMessage: e.target.value })}
                helperText="Printed at the bottom of customer bills"
              />

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-slate-700">
                  Terms & Conditions (Printed on A4 Invoice)
                </label>
                <textarea
                  rows={3}
                  value={settings.termsAndConditions || ""}
                  onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })}
                  className="w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment & UPI (Optional) */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                <div>
                  <CardTitle>UPI & Payment QR (Optional)</CardTitle>
                  <CardDescription>Configure shop UPI ID for QR code generation (leave blank if not used)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Shop UPI ID (Optional)"
                placeholder="e.g. 9561482326@upi"
                value={settings.upiId || ""}
                onChange={(e) => setSettings({ ...settings, upiId: e.target.value })}
                helperText="Leave empty if you don't want UPI QR printed on customer bills"
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-between items-center">
            <Button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              variant="destructive"
              size="md"
              className="font-bold"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Default Data
            </Button>

            <Button type="submit" variant="primary" size="xl" className="font-bold shadow-md shadow-blue-500/20 px-8">
              <Save className="w-5 h-5" />
              Save Shop Settings
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: EXCEL BACKUP & RESTORE PIPELINE */}
      {activeTab === "backup" && <ExcelBackupRestoreCenter />}

      {/* TAB 3: DATABASE & CLOUD OWNERSHIP */}
      {activeTab === "database" && <DatabaseOwnershipCard />}

      {/* Reset Confirmation */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleResetData}
        title="Reset All Data?"
        message="This will reset all shop settings, products, and invoices back to default."
        confirmText="Reset Everything"
      />
    </div>
  );
}
