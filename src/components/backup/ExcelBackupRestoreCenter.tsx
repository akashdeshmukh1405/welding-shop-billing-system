"use client";

import React, { useState, useRef } from "react";
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  ArrowRight,
  RefreshCw,
  Eye,
  ShieldCheck,
  FileCheck,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { excelBackupService, ValidationResult } from "@/services/excelBackupService";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useToast } from "@/context/ToastContext";
import confetti from "canvas-confetti";

export function ExcelBackupRestoreCenter() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);

  const [isExporting, setIsExporting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [previewTab, setPreviewTab] = useState<"invoices" | "customers" | "payments">("invoices");
  const [restoreMode, setRestoreMode] = useState<"replace" | "merge">("replace");
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);

  // MONTHLY REPORTS (EXCEL & WORD)
  const handleDownloadMonthlyExcel = () => {
    try {
      excelBackupService.exportMonthlyExcelReport(selectedYear, selectedMonth);
      toast.success(`Monthly Excel report for ${selectedMonth}/${selectedYear} downloaded!`);
    } catch {
      toast.error("Failed to generate monthly Excel report.");
    }
  };

  const handleDownloadMonthlyWord = async () => {
    setIsGeneratingDocx(true);
    try {
      await excelBackupService.exportMonthlyWordReport(selectedYear, selectedMonth);
      toast.success(`Monthly Word report for ${selectedMonth}/${selectedYear} downloaded!`);
    } catch (err: any) {
      toast.error("Failed to generate Word report: " + (err?.message || "Error"));
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  // FULL JSON DATABASE BACKUP & RESTORE
  const handleExportJsonBackup = () => {
    try {
      excelBackupService.exportJsonDatabaseBackup();
      toast.success("Complete JSON database backup downloaded!");
    } catch {
      toast.error("Failed to export JSON database backup.");
    }
  };

  const handleRestoreJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const res = excelBackupService.restoreJsonDatabaseBackup(content);
        if (res.success) {
          toast.success(res.message);
          confetti({ particleCount: 60, spread: 50 });
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast.error(res.message);
        }
      } catch (err: any) {
        toast.error("Failed to restore JSON backup: " + (err?.message || "Invalid file"));
      }
    };
    reader.readAsText(file);
  };

  // 1. EXCEL BACKUP EXPORT
  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      excelBackupService.exportCompleteBackupExcel();
      toast.success("Excel backup workbook downloaded successfully!");
    } catch {
      toast.error("Failed to export Excel backup.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPendingBills = () => {
    try {
      excelBackupService.exportPendingBillsExcel();
      toast.success("Pending Bills.xlsx downloaded!");
    } catch {
      toast.error("Failed to export Pending Bills.");
    }
  };

  const handleExportCompletedBills = () => {
    try {
      excelBackupService.exportCompletedBillsExcel();
      toast.success("Completed Bills.xlsx downloaded!");
    } catch {
      toast.error("Failed to export Completed Bills.");
    }
  };

  const handleExportAdvancePayments = () => {
    try {
      excelBackupService.exportAdvancePaymentsExcel();
      toast.success("Advance Payments.xlsx downloaded!");
    } catch {
      toast.error("Failed to export Advance Payments.");
    }
  };

  const handleExportAllTransactions = () => {
    try {
      excelBackupService.exportAllTransactionsExcel();
      toast.success("All Transactions.xlsx downloaded!");
    } catch {
      toast.error("Failed to export All Transactions.");
    }
  };

  // 2. UPLOAD & 3. VALIDATE
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload an Excel spreadsheet file (.xlsx or .xls)");
      return;
    }

    setUploadedFile(file);
    setValidationResult(null);
    setRestoreSuccessMessage(null);
    setIsValidating(true);

    try {
      const result = await excelBackupService.parseAndValidateExcel(file);
      setValidationResult(result);
      if (result.isValid) {
        toast.success("Excel backup file validated successfully! Review preview below.");
      } else {
        toast.error("Validation issues found in Excel file. Please review errors.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to parse Excel file.");
    } finally {
      setIsValidating(false);
    }
  };

  // 4. PREVIEW & 5. RESTORE DATABASE
  const handleRestoreDatabase = async () => {
    if (!validationResult || !validationResult.isValid) {
      toast.error("Cannot restore invalid backup data.");
      return;
    }

    setIsRestoring(true);
    try {
      const res = await excelBackupService.restoreDatabase(validationResult.data, restoreMode);
      if (res.success) {
        setRestoreSuccessMessage(res.message);
        toast.success("Database restored successfully!");
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error("Restore failed: " + err?.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleResetWorkflow = () => {
    setUploadedFile(null);
    setValidationResult(null);
    setRestoreSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Workflow Diagram Banner */}
      <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">
          <Database className="w-4 h-4" />
          Enterprise Data Pipeline
        </div>
        <h3 className="text-xl sm:text-2xl font-black tracking-tight">
          Excel Backup & Database Restore Workflow
        </h3>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
          Export your complete workshop database into multi-sheet Excel files or upload an Excel backup to validate, preview, and restore your database safely with zero data loss.
        </p>

        {/* Visual Pipeline Steps */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-center font-bold">
          <div className="p-2.5 rounded-xl bg-slate-800/90 text-blue-300 border border-slate-700">
            1. Excel Backup
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/90 text-amber-300 border border-slate-700">
            2. Upload (.xlsx)
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/90 text-purple-300 border border-slate-700">
            3. Validate
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/90 text-emerald-300 border border-slate-700">
            4. Preview
          </div>
          <div className="p-2.5 rounded-xl bg-slate-800/90 text-rose-300 border border-slate-700 col-span-2 sm:col-span-1">
            5. Restore DB
          </div>
        </div>
      </div>

      {/* STEP 1: EXCEL BACKUP DOWNLOAD */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>1. Export Complete Excel Backup</CardTitle>
                <CardDescription>
                  Generates an organized workbook containing Invoices, Items, Customers, Products, Payments & Settings
                </CardDescription>
              </div>
            </div>

            <Button
              onClick={handleExportExcel}
              variant="primary"
              size="lg"
              disabled={isExporting}
              isLoading={isExporting}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold shadow-md shadow-emerald-600/20"
            >
              <Download className="w-4 h-4" />
              Download Excel Backup (.xlsx)
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* MONTHLY REPORTS (EXCEL & WORD .DOCX) */}
      <Card className="border-2 border-blue-200 bg-blue-50/20 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>End-of-Month Scheduled Reports (Excel & Word .docx)</CardTitle>
                <CardDescription>
                  Download monthly business summaries, customer ledgers, and financial reviews organized by month & year
                </CardDescription>
              </div>
            </div>

            {/* Month & Year Selectors */}
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="h-10 px-3 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April</option>
                <option value={5}>May</option>
                <option value={6}>June</option>
                <option value={7}>July</option>
                <option value={8}>August</option>
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-10 px-3 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Monthly Excel Report */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col justify-between space-y-3">
              <div>
                <p className="font-extrabold text-emerald-950 text-sm flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  Monthly Excel Backup (.xlsx)
                </p>
                <p className="text-xs text-emerald-800 mt-1">
                  Complete 9-sheet workbook: Customers, Products, Pending Bills, Completed Bills, Advance Payments, Partial Collections, Payment History, Customer Ledgers, and Items.
                </p>
              </div>
              <Button
                onClick={handleDownloadMonthlyExcel}
                variant="outline"
                size="sm"
                className="w-full bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100 font-bold"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download Monthly Excel (.xlsx)
              </Button>
            </div>

            {/* Monthly Word Report */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col justify-between space-y-3">
              <div>
                <p className="font-extrabold text-blue-950 text-sm flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-blue-700" />
                  Monthly Word Summary Report (.docx)
                </p>
                <p className="text-xs text-blue-800 mt-1">
                  Formal business summary document: executive metrics, total sales & collections, pending bills table, and customer balance breakdowns ready for management review.
                </p>
              </div>
              <Button
                onClick={handleDownloadMonthlyWord}
                variant="outline"
                size="sm"
                disabled={isGeneratingDocx}
                isLoading={isGeneratingDocx}
                className="w-full bg-white text-blue-800 border-blue-300 hover:bg-blue-100 font-bold"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download Monthly Word (.docx)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MACHINE-RESTORABLE JSON DATABASE BACKUP & RESTORE */}
      <Card className="border-2 border-purple-200 bg-purple-50/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <CardTitle>Machine-Restorable Database Backup & Snapshot (JSON / SQL)</CardTitle>
                <CardDescription>
                  Full database export for 100% exact machine restoration with pre-restore safety snapshot & duplicate prevention
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportJsonBackup}
                variant="secondary"
                size="md"
                className="font-bold text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Export Full DB (JSON)
              </Button>

              <input
                ref={jsonFileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleRestoreJsonFile}
              />

              <Button
                onClick={() => jsonFileInputRef.current?.click()}
                variant="outline"
                size="md"
                className="font-bold text-xs bg-white text-purple-700 border-purple-300 hover:bg-purple-100"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Restore from JSON Backup
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* DEDICATED BUSINESS EXCEL REPORTS */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>Independent Business Reports (Excel)</CardTitle>
              <CardDescription>
                Download individual, customer-owned Excel reports sorted newest at the top with complete audit trails
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Pending Bills */}
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 flex flex-col justify-between space-y-3">
              <div>
                <p className="font-bold text-amber-950 text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                  Pending Bills
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Active unpaid & partial bills with due dates, pending balances, and payment history.
                </p>
              </div>
              <Button
                onClick={handleExportPendingBills}
                variant="outline"
                size="sm"
                className="w-full bg-white border-amber-300 text-amber-900 hover:bg-amber-100 font-bold text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Pending Bills.xlsx
              </Button>
            </div>

            {/* 2. Completed Bills */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex flex-col justify-between space-y-3">
              <div>
                <p className="font-bold text-emerald-950 text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  Completed Bills
                </p>
                <p className="text-xs text-emerald-800 mt-1">
                  Fully settled invoices with payment modes, settlement details, and totals.
                </p>
              </div>
              <Button
                onClick={handleExportCompletedBills}
                variant="outline"
                size="sm"
                className="w-full bg-white border-emerald-300 text-emerald-900 hover:bg-emerald-100 font-bold text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Completed Bills.xlsx
              </Button>
            </div>

            {/* 3. Advance Payments */}
            <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/50 flex flex-col justify-between space-y-3">
              <div>
                <p className="font-bold text-purple-950 text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                  Advance Payments
                </p>
                <p className="text-xs text-purple-800 mt-1">
                  All advance deposits received at order booking with remaining balances.
                </p>
              </div>
              <Button
                onClick={handleExportAdvancePayments}
                variant="outline"
                size="sm"
                className="w-full bg-white border-purple-300 text-purple-900 hover:bg-purple-100 font-bold text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Advance Payments.xlsx
              </Button>
            </div>

            {/* 4. All Transactions */}
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 flex flex-col justify-between space-y-3">
              <div>
                <p className="font-bold text-blue-950 text-sm flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                  All Transactions
                </p>
                <p className="text-xs text-blue-800 mt-1">
                  Complete cash, UPI & bank collection register with transaction timestamps.
                </p>
              </div>
              <Button
                onClick={handleExportAllTransactions}
                variant="outline"
                size="sm"
                className="w-full bg-white border-blue-300 text-blue-900 hover:bg-blue-100 font-bold text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                All Transactions.xlsx
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* STEP 2: UPLOAD EXCEL FILE */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <CardTitle>2. Upload Excel Backup File</CardTitle>
              <CardDescription>Select a previously exported Excel workbook (.xlsx or .xls)</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            id="excel-backup-input"
          />

          {!uploadedFile ? (
            <label
              htmlFor="excel-backup-input"
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/50 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 block"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div>
                <p className="font-extrabold text-slate-800 text-base">
                  Click or drag and drop Excel backup here
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Supports .xlsx and .xls workbooks</p>
              </div>
              <Button type="button" variant="outline" size="sm" className="font-bold pointer-events-none mt-1">
                Browse Files
              </Button>
            </label>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{uploadedFile.name}</p>
                  <p className="text-xs text-slate-500">{(uploadedFile.size / 1024).toFixed(1)} KB • Ready for validation</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={handleResetWorkflow} variant="ghost" size="sm" className="text-xs font-bold text-slate-600">
                  Choose Another
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* STEP 3: VALIDATION RESULTS */}
      {isValidating && (
        <Card className="p-8 text-center bg-blue-50/50 border-blue-200">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="font-bold text-slate-800 text-sm">Validating Excel structure and formulas...</p>
          <p className="text-xs text-slate-500 mt-0.5">Checking invoice numbers, customer phone numbers, item totals, and payment balances</p>
        </Card>
      )}

      {validationResult && (
        <Card className={validationResult.isValid ? "border-emerald-200" : "border-rose-200"}>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                    validationResult.isValid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {validationResult.isValid ? <ShieldCheck className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <CardTitle>3. Validation Status: {validationResult.isValid ? "PASSED ✅" : "FAILED ❌"}</CardTitle>
                  <CardDescription>
                    {validationResult.isValid
                      ? "All integrity formulas, invoice references, and customer links verified."
                      : "Errors detected in spreadsheet rows. Please fix before restoring."}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Error List */}
            {validationResult.errors.length > 0 && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-900">
                <p className="font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Validation Errors ({validationResult.errors.length})
                </p>
                <ul className="list-disc pl-5 space-y-0.5 font-medium">
                  {validationResult.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warning List */}
            {validationResult.warnings.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                <p className="font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Validation Notices ({validationResult.warnings.length})
                </p>
                <ul className="list-disc pl-5 space-y-0.5 font-medium">
                  {validationResult.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* STEP 4: PREVIEW METRICS & DATA TABLE */}
            {validationResult.isValid && (
              <div className="space-y-5 pt-2">
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-base font-black text-slate-900 tracking-tight mb-3">
                    4. Backup Data Preview & Summary
                  </h4>

                  {/* Summary Metric Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-slate-500 font-bold block">Invoices</span>
                      <span className="text-xl font-black text-slate-900">{validationResult.summary.invoicesCount}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {validationResult.summary.paidInvoicesCount} Paid • {validationResult.summary.partialInvoicesCount} Partial • {validationResult.summary.pendingInvoicesCount} Due
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-slate-500 font-bold block">Customers</span>
                      <span className="text-xl font-black text-slate-900">{validationResult.summary.customersCount}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Customer profiles</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-slate-500 font-bold block">Total Billed</span>
                      <span className="text-xl font-black text-slate-900">{formatCurrency(validationResult.summary.totalGrandTotal)}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Cumulative sales</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-slate-500 font-bold block">Total Pending Due</span>
                      <span className="text-xl font-black text-rose-600">{formatCurrency(validationResult.summary.totalOutstanding)}</span>
                      <span className="text-[10px] text-emerald-600 block mt-0.5">
                        Paid: {formatCurrency(validationResult.summary.totalCollected)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Preview Tabs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex rounded-xl border border-slate-300 bg-slate-100 p-1 text-xs font-bold">
                      <button
                        onClick={() => setPreviewTab("invoices")}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          previewTab === "invoices" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                        }`}
                      >
                        Invoices ({validationResult.data.invoices.length})
                      </button>
                      <button
                        onClick={() => setPreviewTab("customers")}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          previewTab === "customers" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                        }`}
                      >
                        Customers ({validationResult.data.customers.length})
                      </button>
                      <button
                        onClick={() => setPreviewTab("payments")}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          previewTab === "payments" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
                        }`}
                      >
                        Payments ({validationResult.data.payments.length})
                      </button>
                    </div>

                    <span className="text-xs text-slate-500 font-semibold">
                      Showing preview of parsed rows
                    </span>
                  </div>

                  {/* Tab Content Table */}
                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl text-xs">
                    {previewTab === "invoices" && (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 sticky top-0 font-bold text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Invoice #</th>
                            <th className="p-2.5">Customer</th>
                            <th className="p-2.5 text-right">Total</th>
                            <th className="p-2.5 text-right">Paid</th>
                            <th className="p-2.5 text-right">Pending</th>
                            <th className="p-2.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {validationResult.data.invoices.slice(0, 8).map((inv, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-900">{inv.invoiceNumber}</td>
                              <td className="p-2.5 text-slate-700">{inv.customerName}</td>
                              <td className="p-2.5 text-right font-bold">{formatCurrency(inv.grandTotal)}</td>
                              <td className="p-2.5 text-right text-emerald-700 font-bold">{formatCurrency(inv.paidAmount)}</td>
                              <td className="p-2.5 text-right text-rose-600 font-bold">{formatCurrency(inv.pendingAmount)}</td>
                              <td className="p-2.5 text-center">
                                <PaymentStatusBadge status={inv.status} size="sm" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {previewTab === "customers" && (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 sticky top-0 font-bold text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Customer Name</th>
                            <th className="p-2.5">Phone</th>
                            <th className="p-2.5 text-right">Total Billed</th>
                            <th className="p-2.5 text-right">Pending Due</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {validationResult.data.customers.slice(0, 8).map((c, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-900">{c.name}</td>
                              <td className="p-2.5 text-slate-600 font-mono">{c.phone}</td>
                              <td className="p-2.5 text-right font-bold">{formatCurrency(c.totalBilled)}</td>
                              <td className="p-2.5 text-right text-rose-600 font-bold">{formatCurrency(c.totalPending)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}

                    {previewTab === "payments" && (
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 sticky top-0 font-bold text-slate-600 border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Invoice #</th>
                            <th className="p-2.5">Customer</th>
                            <th className="p-2.5 text-right">Amount</th>
                            <th className="p-2.5 text-center">Mode</th>
                            <th className="p-2.5">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {validationResult.data.payments.slice(0, 8).map((pay, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 font-bold text-slate-900">{pay.invoiceNumber}</td>
                              <td className="p-2.5 text-slate-700">{pay.customerName}</td>
                              <td className="p-2.5 text-right font-bold text-emerald-700">{formatCurrency(pay.amount)}</td>
                              <td className="p-2.5 text-center font-bold text-slate-600">{pay.paymentMethod}</td>
                              <td className="p-2.5 text-slate-500">{formatDate(pay.date)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                {/* STEP 5: RESTORE DATABASE CONTROLS */}
                <div className="p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-2xl space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-black tracking-tight flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-400" />
                        5. Commit & Restore Database
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        Choose restore mode and write validated backup data to the workshop database
                      </p>
                    </div>

                    {/* Mode Selector */}
                    <div className="inline-flex rounded-xl bg-slate-800 border border-slate-700 p-1 text-xs font-bold text-white">
                      <button
                        onClick={() => setRestoreMode("replace")}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          restoreMode === "replace" ? "bg-blue-600 text-white shadow" : "text-slate-400"
                        }`}
                      >
                        Clean Replace (Exact)
                      </button>
                      <button
                        onClick={() => setRestoreMode("merge")}
                        className={`px-3 py-1.5 rounded-lg transition-all ${
                          restoreMode === "merge" ? "bg-blue-600 text-white shadow" : "text-slate-400"
                        }`}
                      >
                        Merge & Append
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <Button
                      onClick={handleRestoreDatabase}
                      variant="primary"
                      size="xl"
                      disabled={isRestoring}
                      isLoading={isRestoring}
                      className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black shadow-lg shadow-emerald-500/20 text-base h-13 px-8"
                    >
                      <CheckCircle2 className="w-5 h-5 text-slate-950" />
                      RESTORE DATABASE NOW
                    </Button>
                  </div>
                </div>

                {/* Success Banner */}
                {restoreSuccessMessage && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <span>{restoreSuccessMessage}</span>
                    </div>
                    <Button
                      onClick={() => window.location.href = "/"}
                      variant="primary"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold flex-shrink-0"
                    >
                      Go to Dashboard →
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
