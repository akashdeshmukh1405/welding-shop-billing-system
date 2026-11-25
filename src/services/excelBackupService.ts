import * as XLSX from "xlsx";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  TextRun,
  HeadingLevel,
  AlignmentType,
  WidthType,
} from "docx";
import { Customer, Invoice, InvoiceItem, PaymentRecord, Product, ShopSettings } from "@/types";
import { storageService } from "./storageService";
import { customerService } from "./customerService";
import { formatCurrency, formatAmount, formatDate } from "@/lib/utils";

export interface BackupSummary {
  invoicesCount: number;
  paidInvoicesCount: number;
  partialInvoicesCount: number;
  pendingInvoicesCount: number;
  customersCount: number;
  productsCount: number;
  paymentsCount: number;
  totalGrandTotal: number;
  totalCollected: number;
  totalOutstanding: number;
}

export interface ValidatedBackupData {
  invoices: Invoice[];
  customers: Customer[];
  products: Product[];
  payments: PaymentRecord[];
  settings?: ShopSettings;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: BackupSummary;
  data: ValidatedBackupData;
}

export class ExcelBackupService {
  /**
   * 1. EXCEL BACKUP: Exports all system data into a multi-sheet formatted .xlsx workbook
   */
  public exportCompleteBackupExcel(): void {
    const invoices = storageService.getInvoices();
    const customers = storageService.getCustomers();
    const products = storageService.getProducts();
    const payments = storageService.getPayments();
    const settings = storageService.getSettings();

    // 1. Flatten Invoices
    const invoicesData = invoices.map((inv) => ({
      "Invoice Number": inv.invoiceNumber,
      "Date": inv.date,
      "Due Date": inv.dueDate || "",
      "Customer Name": inv.customerName,
      "Customer Phone": inv.customerPhone,
      "Customer Address": inv.customerAddress || "",
      "Customer GSTIN": inv.customerGst || "",
      "Subtotal (Rs)": inv.subtotal,
      "Discount (Rs)": inv.discountAmount,
      "Grand Total (Rs)": inv.grandTotal,
      "Paid Amount (Rs)": inv.paidAmount,
      "Pending Amount (Rs)": inv.pendingAmount,
      "Payment Status": inv.status,
      "Primary Payment Mode": inv.primaryPaymentMethod,
      "Notes": inv.notes || "",
    }));

    // 2. Flatten Invoice Items
    const itemsData: any[] = [];
    invoices.forEach((inv) => {
      inv.items.forEach((item, idx) => {
        itemsData.push({
          "Invoice Number": inv.invoiceNumber,
          "Item #": idx + 1,
          "Item Name": item.name,
          "Description": item.description || "",
          "Quantity": item.quantity,
          "Unit": item.unit,
          "Rate (Rs)": item.unitPrice,
          "Total (Rs)": item.total,
        });
      });
    });

    // 3. Flatten Customers
    const customersData = customers.map((c) => ({
      "Customer Name": c.name,
      "Phone": c.phone,
      "Address": c.address || "",
      "GSTIN": c.gstNumber || "",
      "Total Bills": c.totalBills,
      "Total Billed (Rs)": c.totalBilled,
      "Total Paid (Rs)": c.totalPaid,
      "Total Pending (Rs)": c.totalPending,
    }));

    // 4. Flatten Products
    const productsData = products.map((p) => ({
      "Product / Work Name": p.name,
      "Description": p.description || "",
      "Category": p.category || "FABRICATION",
      "Unit": p.unit,
      "Default Rate (Rs)": p.defaultPrice,
      "Active": p.isActive ? "YES" : "NO",
    }));

    // 5. Flatten Payments
    const paymentsData = payments.map((pay) => ({
      "Payment ID": pay.id,
      "Invoice Number": pay.invoiceNumber,
      "Customer Name": pay.customerName,
      "Customer Phone": pay.customerPhone,
      "Amount (Rs)": pay.amount,
      "Payment Method": pay.paymentMethod,
      "Reference Note": pay.referenceNote || "",
      "Date": pay.date,
      "Time": pay.time || "",
    }));

    // 6. Flatten Shop Settings
    const settingsData = [
      {
        "Shop Name": settings.shopName,
        "Owner": settings.ownerName,
        "Address": settings.shopAddress,
        "Phone": settings.shopPhone,
        "Alt Phone": settings.altPhone || "",
        "Email": settings.email || "",
        "GSTIN": settings.gstNumber || "",
        "UPI ID": settings.upiId || "",
        "Invoice Prefix": settings.invoicePrefix || "INV-",
        "Terms and Conditions": settings.termsAndConditions || "",
        "Footer Message": settings.invoiceFooterMessage || "",
      },
    ];

    // Create workbook and append worksheets
    const wb = XLSX.utils.book_new();

    const wsInvoices = XLSX.utils.json_to_sheet(invoicesData);
    const wsItems = XLSX.utils.json_to_sheet(itemsData);
    const wsCustomers = XLSX.utils.json_to_sheet(customersData);
    const wsProducts = XLSX.utils.json_to_sheet(productsData);
    const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
    const wsSettings = XLSX.utils.json_to_sheet(settingsData);

    XLSX.utils.book_append_sheet(wb, wsInvoices, "Invoices");
    XLSX.utils.book_append_sheet(wb, wsItems, "Invoice_Items");
    XLSX.utils.book_append_sheet(wb, wsCustomers, "Customers");
    XLSX.utils.book_append_sheet(wb, wsProducts, "Products");
    XLSX.utils.book_append_sheet(wb, wsPayments, "Payments");
    XLSX.utils.book_append_sheet(wb, wsSettings, "Settings");

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Jay_Mata_Di_Steel_Backup_${dateStr}.xlsx`;

    XLSX.writeFile(wb, filename);
  }

  /**
   * Dedicated Report 1: Pending Bills.xlsx
   * Newest records at the top, includes all required fields & payment history summary
   */
  public exportPendingBillsExcel(): void {
    const invoices = storageService.getInvoices();
    const payments = storageService.getPayments();

    // Filter pending/partial invoices and sort newest first
    const pendingList = invoices
      .filter((inv) => inv.status === "PENDING" || inv.status === "PARTIAL" || inv.pendingAmount > 0)
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

    const rows = pendingList.map((inv) => {
      // Find linked payments for this invoice
      const invoicePayments = payments
        .filter((p) => p.invoiceId === inv.id || p.invoiceNumber === inv.invoiceNumber)
        .map((p) => `Rs.${p.amount} on ${p.date} (${p.paymentMethod})`)
        .join("; ");

      return {
        "Invoice Number": inv.invoiceNumber,
        "Date & Time": inv.date,
        "Customer Name": inv.customerName,
        "Customer Mobile": inv.customerPhone,
        "Total Amount (Rs)": inv.grandTotal,
        "Paid Amount (Rs)": inv.paidAmount,
        "Pending Amount (Rs)": inv.pendingAmount,
        "Payment Status": inv.status,
        "Due Date": inv.dueDate || "N/A",
        "Primary Payment Mode": inv.primaryPaymentMethod,
        "Payment History": invoicePayments || (inv.paidAmount > 0 ? `Advance Rs.${inv.paidAmount}` : "No payments received yet"),
        "Customer Address": inv.customerAddress || "",
        "Notes": inv.notes || "",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ "Message": "No pending bills found" }]);
    XLSX.utils.book_append_sheet(wb, ws, "Pending Bills");
    XLSX.writeFile(wb, "Pending Bills.xlsx");
  }

  /**
   * Dedicated Report 2: Completed Bills.xlsx
   * Newest records at the top, only fully settled bills
   */
  public exportCompletedBillsExcel(): void {
    const invoices = storageService.getInvoices();
    const payments = storageService.getPayments();

    const completedList = invoices
      .filter((inv) => inv.status === "PAID" || inv.pendingAmount <= 0)
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

    const rows = completedList.map((inv) => {
      const invoicePayments = payments
        .filter((p) => p.invoiceId === inv.id || p.invoiceNumber === inv.invoiceNumber)
        .map((p) => `Rs.${p.amount} on ${p.date} (${p.paymentMethod})`)
        .join("; ");

      return {
        "Invoice Number": inv.invoiceNumber,
        "Date & Time": inv.date,
        "Customer Name": inv.customerName,
        "Customer Mobile": inv.customerPhone,
        "Total Amount (Rs)": inv.grandTotal,
        "Paid Amount (Rs)": inv.paidAmount,
        "Pending Amount (Rs)": 0,
        "Payment Status": "PAID",
        "Primary Payment Mode": inv.primaryPaymentMethod,
        "Payment History": invoicePayments || `Settled in full Rs.${inv.paidAmount}`,
        "Customer Address": inv.customerAddress || "",
        "Notes": inv.notes || "",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ "Message": "No completed bills found" }]);
    XLSX.utils.book_append_sheet(wb, ws, "Completed Bills");
    XLSX.writeFile(wb, "Completed Bills.xlsx");
  }

  /**
   * Dedicated Report 3: Advance Payments.xlsx
   * Newest records at the top, lists advance payments collected at or after bill creation
   */
  public exportAdvancePaymentsExcel(): void {
    const invoices = storageService.getInvoices();
    const payments = storageService.getPayments();

    // Collect advance payments: either recorded payments with 'advance' in notes or initial advance on invoices
    const advanceRecords: any[] = [];

    // From payment records
    payments
      .filter((p) => p.referenceNote?.toLowerCase().includes("advance"))
      .forEach((p) => {
        const inv = invoices.find((i) => i.id === p.invoiceId || i.invoiceNumber === p.invoiceNumber);
        advanceRecords.push({
          "Payment ID": p.id,
          "Invoice Number": p.invoiceNumber || inv?.invoiceNumber || "N/A",
          "Date & Time": p.date + (p.time ? ` ${p.time}` : ""),
          "Customer Name": p.customerName || inv?.customerName || "Customer",
          "Customer Mobile": p.customerPhone || inv?.customerPhone || "",
          "Advance Amount Received (Rs)": p.amount,
          "Total Bill Amount (Rs)": inv?.grandTotal || p.amount,
          "Remaining Pending (Rs)": inv ? inv.pendingAmount : 0,
          "Payment Status": inv?.status || "PARTIAL",
          "Payment Mode": p.paymentMethod,
          "Reference Note": p.referenceNote || "Advance payment",
        });
      });

    // Also include any invoice that had an advance paid at creation if not captured above
    invoices.forEach((inv) => {
      if (inv.paidAmount > 0 && inv.status !== "PAID") {
        const alreadyCaptured = advanceRecords.some((r) => r["Invoice Number"] === inv.invoiceNumber);
        if (!alreadyCaptured) {
          advanceRecords.push({
            "Payment ID": `ADV-${inv.invoiceNumber}`,
            "Invoice Number": inv.invoiceNumber,
            "Date & Time": inv.date,
            "Customer Name": inv.customerName,
            "Customer Mobile": inv.customerPhone,
            "Advance Amount Received (Rs)": inv.paidAmount,
            "Total Bill Amount (Rs)": inv.grandTotal,
            "Remaining Pending (Rs)": inv.pendingAmount,
            "Payment Status": inv.status,
            "Payment Mode": inv.primaryPaymentMethod,
            "Reference Note": "Initial advance payment on bill creation",
          });
        }
      }
    });

    // Sort newest first
    advanceRecords.sort((a, b) => new Date(b["Date & Time"]).getTime() - new Date(a["Date & Time"]).getTime());

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(advanceRecords.length > 0 ? advanceRecords : [{ "Message": "No advance payments recorded" }]);
    XLSX.utils.book_append_sheet(wb, ws, "Advance Payments");
    XLSX.writeFile(wb, "Advance Payments.xlsx");
  }

  /**
   * Dedicated Report 4: All Transactions.xlsx
   * Newest records at the top, includes comprehensive payment history
   */
  public exportAllTransactionsExcel(): void {
    const invoices = storageService.getInvoices();
    const payments = storageService.getPayments();

    const sortedPayments = [...payments].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const rows = sortedPayments.map((p) => {
      const inv = invoices.find((i) => i.id === p.invoiceId || i.invoiceNumber === p.invoiceNumber);
      return {
        "Payment ID": p.id,
        "Date & Time": p.date + (p.time ? ` ${p.time}` : ""),
        "Invoice Number": p.invoiceNumber || inv?.invoiceNumber || "N/A",
        "Customer Name": p.customerName || inv?.customerName || "Customer",
        "Customer Mobile": p.customerPhone || inv?.customerPhone || "",
        "Transaction Type": p.referenceNote?.toLowerCase().includes("advance")
          ? "Advance Payment"
          : inv?.status === "PAID"
          ? "Final Settlement"
          : "Partial Collection",
        "Amount Received (Rs)": p.amount,
        "Total Bill Amount (Rs)": inv?.grandTotal || p.amount,
        "Current Pending Balance (Rs)": inv ? inv.pendingAmount : 0,
        "Payment Status": inv?.status || "PAID",
        "Payment Mode": p.paymentMethod,
        "Reference Note": p.referenceNote || "",
        "Transaction ID / UPI Ref": p.transactionId || "N/A",
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ "Message": "No transactions recorded yet" }]);
    XLSX.utils.book_append_sheet(wb, ws, "All Transactions");
    XLSX.writeFile(wb, "All Transactions.xlsx");
  }

  /**
   * Helper to trigger download in browser
   */
  private triggerBrowserDownload(blob: Blob, filename: string): void {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Monthly Excel (.xlsx) Report with all 9 requested sheets:
   * Customers, Products, Pending Bills, Completed Bills, Advance Payments, Partial Payments,
   * Payment History, Customer Ledger, Invoice Details
   */
  public exportMonthlyExcelReport(year: number, month: number): void {
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const allInvoices = storageService.getInvoices();
    const allPayments = storageService.getPayments();
    const allCustomers = storageService.getCustomers();
    const allProducts = storageService.getProducts();

    // Filter by month
    const monthInvoices = allInvoices.filter((i) => i.date.startsWith(monthPrefix));
    const monthPayments = allPayments.filter((p) => p.date.startsWith(monthPrefix));

    // 1. Customers Sheet
    const customersData = allCustomers.map((c) => ({
      "Customer Name": c.name,
      "Mobile Number": c.phone,
      "Address": c.address || "",
      "GSTIN": c.gstNumber || "",
      "Total Bills": c.totalBills,
      "Total Billed (Rs)": c.totalBilled,
      "Total Paid (Rs)": c.totalPaid,
      "Current Pending (Rs)": c.totalPending,
    }));

    // 2. Products Sheet
    const productsData = allProducts.map((p) => ({
      "Item Name": p.name,
      "Category": p.category || "Fabrication",
      "Unit": p.unit,
      "Default Rate (Rs)": p.defaultPrice,
      "Active": p.isActive ? "Yes" : "No",
    }));

    // 3. Pending Bills Sheet
    const pendingBills = (monthInvoices.length > 0 ? monthInvoices : allInvoices).filter(
      (inv) => inv.pendingAmount > 0
    );
    const pendingData = pendingBills.map((inv) => ({
      "Invoice Number": inv.invoiceNumber,
      "Date": inv.date,
      "Customer Name": inv.customerName,
      "Customer Mobile": inv.customerPhone,
      "Grand Total (Rs)": inv.grandTotal,
      "Paid Amount (Rs)": inv.paidAmount,
      "Pending Balance (Rs)": inv.pendingAmount,
      "Status": inv.status,
      "Due Date": inv.dueDate || "N/A",
    }));

    // 4. Completed Bills Sheet
    const completedBills = (monthInvoices.length > 0 ? monthInvoices : allInvoices).filter(
      (inv) => inv.pendingAmount <= 0 || inv.status === "PAID"
    );
    const completedData = completedBills.map((inv) => ({
      "Invoice Number": inv.invoiceNumber,
      "Date": inv.date,
      "Customer Name": inv.customerName,
      "Customer Mobile": inv.customerPhone,
      "Grand Total (Rs)": inv.grandTotal,
      "Paid Amount (Rs)": inv.paidAmount,
      "Payment Mode": inv.primaryPaymentMethod,
      "Status": "PAID",
    }));

    // 5. Advance Payments Sheet
    const advancePayments = (monthPayments.length > 0 ? monthPayments : allPayments).filter((p) =>
      p.referenceNote?.toLowerCase().includes("advance")
    );
    const advanceData = advancePayments.map((p) => ({
      "Payment ID": p.id,
      "Date": p.date,
      "Invoice Number": p.invoiceNumber,
      "Customer Name": p.customerName,
      "Customer Mobile": p.customerPhone,
      "Advance Amount (Rs)": p.amount,
      "Payment Mode": p.paymentMethod,
      "Note": p.referenceNote || "Advance booking",
    }));

    // 6. Partial Payments Sheet
    const partialPayments = (monthPayments.length > 0 ? monthPayments : allPayments).filter(
      (p) => !p.referenceNote?.toLowerCase().includes("advance")
    );
    const partialData = partialPayments.map((p) => ({
      "Payment ID": p.id,
      "Date": p.date,
      "Invoice Number": p.invoiceNumber,
      "Customer Name": p.customerName,
      "Customer Mobile": p.customerPhone,
      "Amount Paid (Rs)": p.amount,
      "Payment Mode": p.paymentMethod,
      "Reference Note": p.referenceNote || "",
    }));

    // 7. Payment History Sheet
    const paymentHistory = (monthPayments.length > 0 ? monthPayments : allPayments).map((p) => ({
      "Payment ID": p.id,
      "Date & Time": p.date + (p.time ? ` ${p.time}` : ""),
      "Invoice Number": p.invoiceNumber,
      "Customer Name": p.customerName,
      "Customer Mobile": p.customerPhone,
      "Amount Received (Rs)": p.amount,
      "Payment Method": p.paymentMethod,
      "Reference Note": p.referenceNote || "",
    }));

    // 8. Customer Ledger Sheet
    const ledgerRows: any[] = [];
    allCustomers.forEach((cust) => {
      const { ledger } = customerService.getCustomerLedger(cust.id);
      ledger.forEach((entry) => {
        ledgerRows.push({
          "Customer Name": cust.name,
          "Customer Mobile": cust.phone,
          "Date": entry.date,
          "Type": entry.type,
          "Invoice / Receipt": entry.invoiceNumber || entry.paymentId || "",
          "Description": entry.description,
          "Debit (Billed Rs)": entry.debit,
          "Credit (Paid Rs)": entry.credit,
          "Running Balance (Rs)": entry.runningBalance,
        });
      });
    });

    // 9. Invoice Details Sheet
    const invoiceDetails: any[] = [];
    (monthInvoices.length > 0 ? monthInvoices : allInvoices).forEach((inv) => {
      inv.items.forEach((item, idx) => {
        invoiceDetails.push({
          "Invoice Number": inv.invoiceNumber,
          "Date": inv.date,
          "Customer Name": inv.customerName,
          "Item #": idx + 1,
          "Item Description": item.name + (item.description ? ` (${item.description})` : ""),
          "Quantity": item.quantity,
          "Unit": item.unit,
          "Rate (Rs)": item.unitPrice,
          "Total (Rs)": item.total,
        });
      });
    });

    // Assemble Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customersData), "Customers");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productsData), "Products");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pendingData.length ? pendingData : [{ Message: "None" }]), "Pending_Bills");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(completedData.length ? completedData : [{ Message: "None" }]), "Completed_Bills");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(advanceData.length ? advanceData : [{ Message: "None" }]), "Advance_Payments");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(partialData.length ? partialData : [{ Message: "None" }]), "Partial_Payments");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentHistory.length ? paymentHistory : [{ Message: "None" }]), "Payment_History");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ledgerRows.length ? ledgerRows : [{ Message: "None" }]), "Customer_Ledger");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceDetails.length ? invoiceDetails : [{ Message: "None" }]), "Invoice_Details");

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const filename = `Jay_Mata_Di_Monthly_Backup_${monthNames[month - 1]}_${year}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  /**
   * Monthly Word (.docx) Report:
   * Monthly billing summary, total sales, total payments received, total outstanding balance,
   * pending invoices, completed invoices, customer-wise summaries
   */
  public async exportMonthlyWordReport(year: number, month: number): Promise<void> {
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const allInvoices = storageService.getInvoices();
    const allPayments = storageService.getPayments();
    const allCustomers = storageService.getCustomers();

    const monthInvoices = allInvoices.filter((i) => i.date.startsWith(monthPrefix));
    const effectiveInvoices = monthInvoices.length > 0 ? monthInvoices : allInvoices;
    const monthPayments = allPayments.filter((p) => p.date.startsWith(monthPrefix));
    const effectivePayments = monthPayments.length > 0 ? monthPayments : allPayments;

    const totalSales = effectiveInvoices.reduce((sum, i) => sum + i.grandTotal, 0);
    const totalCollected = effectivePayments.reduce((sum, p) => sum + p.amount, 0);
    const totalPending = effectiveInvoices.reduce((sum, i) => sum + i.pendingAmount, 0);

    const pendingInvoices = effectiveInvoices.filter((i) => i.pendingAmount > 0);
    const completedInvoices = effectiveInvoices.filter((i) => i.pendingAmount <= 0);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthLabel = `${monthNames[month - 1]} ${year}`;

    // Helper for table header cells
    const createHeaderCell = (text: string) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 18 })] })],
        shading: { fill: "0F172A" },
      });

    // Helper for table data cells
    const createDataCell = (text: string) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, size: 18 })] })],
      });

    // 1. Summary Table
    const summaryTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [createHeaderCell("Financial Metric"), createHeaderCell("Amount / Count")],
        }),
        new TableRow({ children: [createDataCell("Total Sales Generated:"), createDataCell(`Rs. ${formatAmount(totalSales)}`)] }),
        new TableRow({ children: [createDataCell("Total Payments Collected:"), createDataCell(`Rs. ${formatAmount(totalCollected)}`)] }),
        new TableRow({ children: [createDataCell("Total Outstanding Balance:"), createDataCell(`Rs. ${formatAmount(totalPending)}`)] }),
        new TableRow({ children: [createDataCell("Total Invoices Generated:"), createDataCell(String(effectiveInvoices.length))] }),
        new TableRow({ children: [createDataCell("Completed (Paid) Invoices:"), createDataCell(String(completedInvoices.length))] }),
        new TableRow({ children: [createDataCell("Pending Invoices:"), createDataCell(String(pendingInvoices.length))] }),
      ],
    });

    // 2. Pending Invoices Table
    const pendingRows: TableRow[] = [
      new TableRow({
        children: [
          createHeaderCell("Invoice #"),
          createHeaderCell("Date"),
          createHeaderCell("Customer Name"),
          createHeaderCell("Mobile"),
          createHeaderCell("Grand Total"),
          createHeaderCell("Paid Amount"),
          createHeaderCell("Pending Balance"),
        ],
      }),
    ];

    if (pendingInvoices.length === 0) {
      pendingRows.push(
        new TableRow({
          children: [new TableCell({ children: [new Paragraph("No pending invoices found.")], columnSpan: 7 })],
        })
      );
    } else {
      pendingInvoices.forEach((inv) => {
        pendingRows.push(
          new TableRow({
            children: [
              createDataCell(inv.invoiceNumber),
              createDataCell(inv.date),
              createDataCell(inv.customerName),
              createDataCell(inv.customerPhone),
              createDataCell(`Rs. ${formatAmount(inv.grandTotal)}`),
              createDataCell(`Rs. ${formatAmount(inv.paidAmount)}`),
              createDataCell(`Rs. ${formatAmount(inv.pendingAmount)}`),
            ],
          })
        );
      });
    }

    const pendingTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: pendingRows,
    });

    // 3. Customer Summaries Table
    const customerRows: TableRow[] = [
      new TableRow({
        children: [
          createHeaderCell("Customer Name"),
          createHeaderCell("Mobile Number"),
          createHeaderCell("Total Bills"),
          createHeaderCell("Total Billed"),
          createHeaderCell("Total Paid"),
          createHeaderCell("Outstanding Balance"),
        ],
      }),
    ];

    allCustomers.forEach((c) => {
      customerRows.push(
        new TableRow({
          children: [
            createDataCell(c.name),
            createDataCell(c.phone),
            createDataCell(String(c.totalBills || 0)),
            createDataCell(`Rs. ${formatAmount(c.totalBilled || 0)}`),
            createDataCell(`Rs. ${formatAmount(c.totalPaid || 0)}`),
            createDataCell(`Rs. ${formatAmount(c.totalPending || 0)}`),
          ],
        })
      );
    });

    const customerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: customerRows,
    });

    // Construct Document
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "JAI MATA DI STEEL FURNITURE & RAILING",
                  bold: true,
                  size: 28,
                  color: "0F172A",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Mr. Vaibhav Wagh | Mobile: +91 9561482326 | Bodwad, Jalgaon",
                  size: 18,
                  color: "64748B",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Monthly Billing & Financial Summary — ${monthLabel}`,
                  bold: true,
                  size: 24,
                  color: "1E3A8A",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "1. Monthly Key Performance Summary",
                  bold: true,
                  size: 20,
                  color: "0F172A",
                }),
              ],
            }),
            new Paragraph({ text: "" }),
            summaryTable,
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "2. Pending Invoices Statement",
                  bold: true,
                  size: 20,
                  color: "B91C1C",
                }),
              ],
            }),
            new Paragraph({ text: "" }),
            pendingTable,
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "3. Customer Account Balances & Ledgers",
                  bold: true,
                  size: 20,
                  color: "0F172A",
                }),
              ],
            }),
            new Paragraph({ text: "" }),
            customerTable,
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Report generated on " + new Date().toLocaleDateString("en-IN") + " for official shop records.",
                  italics: true,
                  size: 16,
                  color: "94A3B8",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    const filename = `Jay_Mata_Di_Monthly_Summary_${monthNames[month - 1]}_${year}.docx`;
    this.triggerBrowserDownload(blob, filename);
  }

  /**
   * Complete Machine-Restorable JSON Database Backup
   */
  public exportJsonDatabaseBackup(): void {
    const jsonString = storageService.exportAllData();
    const blob = new Blob([jsonString], { type: "application/json" });
    const filename = `Jay_Mata_Di_Database_Backup_${new Date().toISOString().split("T")[0]}.json`;
    this.triggerBrowserDownload(blob, filename);
  }

  /**
   * Safe Machine-Restorable JSON Database Restore:
   * 1. Creates a safety snapshot of the existing database before performing restore
   * 2. Validates structure and prevents duplicate invoices / payments
   * 3. Recalculates all customer balances
   */
  public restoreJsonDatabaseBackup(jsonString: string): {
    success: boolean;
    message: string;
    snapshotKey?: string;
  } {
    try {
      const data = JSON.parse(jsonString);

      // Validate required arrays
      if (!Array.isArray(data.invoices) || !Array.isArray(data.customers)) {
        return {
          success: false,
          message: "Invalid JSON backup file: missing invoices or customers data arrays.",
        };
      }

      // 1. Create safety snapshot of current database
      let snapshotKey = "";
      if (typeof window !== "undefined") {
        snapshotKey = `prerestore_safety_snapshot_${Date.now()}`;
        localStorage.setItem(snapshotKey, storageService.exportAllData());
      }

      // 2. Prevent duplicate invoices
      const existingInvoices = storageService.getInvoices();
      const existingInvoiceNumbers = new Set(existingInvoices.map((i) => i.invoiceNumber));

      const newInvoicesToSave: Invoice[] = [...existingInvoices];
      let importedInvoicesCount = 0;

      data.invoices.forEach((inv: Invoice) => {
        if (!existingInvoiceNumbers.has(inv.invoiceNumber)) {
          newInvoicesToSave.push(inv);
          existingInvoiceNumbers.add(inv.invoiceNumber);
          importedInvoicesCount++;
        }
      });

      // 3. Prevent duplicate payments
      const existingPayments = storageService.getPayments();
      const existingPaymentIds = new Set(existingPayments.map((p) => p.id));
      const newPaymentsToSave: PaymentRecord[] = [...existingPayments];
      let importedPaymentsCount = 0;

      if (Array.isArray(data.payments)) {
        data.payments.forEach((pay: PaymentRecord) => {
          if (!existingPaymentIds.has(pay.id)) {
            newPaymentsToSave.push(pay);
            existingPaymentIds.add(pay.id);
            importedPaymentsCount++;
          }
        });
      }

      // 4. Merge Customers by phone
      const existingCustomers = storageService.getCustomers();
      const customerMap = new Map<string, Customer>();
      existingCustomers.forEach((c) => customerMap.set(c.phone, c));
      data.customers.forEach((c: Customer) => {
        if (!customerMap.has(c.phone)) {
          customerMap.set(c.phone, c);
        }
      });

      storageService.saveInvoices(newInvoicesToSave);
      storageService.savePayments(newPaymentsToSave);
      storageService.saveCustomers(Array.from(customerMap.values()));
      if (data.products && Array.isArray(data.products)) {
        storageService.saveProducts(data.products);
      }
      if (data.settings) {
        storageService.saveSettings(data.settings);
      }

      // Recalculate customer statistics
      storageService.recalculateAllCustomerStats();

      return {
        success: true,
        message: `Database restored successfully! Imported ${importedInvoicesCount} new invoices and ${importedPaymentsCount} new payments. Pre-restore snapshot created.`,
        snapshotKey,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || "Failed to parse or restore JSON database backup.",
      };
    }
  }

  /**
   * 2. UPLOAD & PARSE & 3. VALIDATE: Validates spreadsheet structure, math integrity, and references
   */
  public async parseAndValidateExcel(file: File): Promise<ValidationResult> {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: "array" });

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check essential sheets
    const sheetNames = wb.SheetNames;
    if (!sheetNames.includes("Invoices")) {
      errors.push("Missing 'Invoices' worksheet in Excel file.");
    }

    const invoicesRaw: any[] = sheetNames.includes("Invoices")
      ? XLSX.utils.sheet_to_json(wb.Sheets["Invoices"])
      : [];
    const itemsRaw: any[] = sheetNames.includes("Invoice_Items")
      ? XLSX.utils.sheet_to_json(wb.Sheets["Invoice_Items"])
      : [];
    const customersRaw: any[] = sheetNames.includes("Customers")
      ? XLSX.utils.sheet_to_json(wb.Sheets["Customers"])
      : [];
    const productsRaw: any[] = sheetNames.includes("Products")
      ? XLSX.utils.sheet_to_json(wb.Sheets["Products"])
      : [];
    const paymentsRaw: any[] = sheetNames.includes("Payments")
      ? XLSX.utils.sheet_to_json(wb.Sheets["Payments"])
      : [];

    if (invoicesRaw.length === 0) {
      errors.push("No invoices found in 'Invoices' sheet.");
    }

    // Map items by invoice number
    const itemsByInvoice = new Map<string, InvoiceItem[]>();
    itemsRaw.forEach((row, idx) => {
      const invNo = String(row["Invoice Number"] || "").trim();
      if (!invNo) return;

      const qty = Number(row["Quantity"]) || 1;
      const rate = Number(row["Rate (Rs)"]) || 0;
      const total = Number(row["Total (Rs)"]) || qty * rate;

      const item: InvoiceItem = {
        id: `imported-item-${idx}`,
        name: String(row["Item Name"] || "Fabrication Work").trim(),
        description: row["Description"] ? String(row["Description"]).trim() : undefined,
        quantity: qty,
        unit: (row["Unit"] as any) || "nos",
        unitPrice: rate,
        total: total,
      };

      if (!itemsByInvoice.has(invNo)) {
        itemsByInvoice.set(invNo, []);
      }
      itemsByInvoice.get(invNo)!.push(item);
    });

    // Validated Invoices
    const validatedInvoices: Invoice[] = [];
    let totalGrand = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let paidCount = 0;
    let partialCount = 0;
    let pendingCount = 0;

    invoicesRaw.forEach((row, index) => {
      const rowNum = index + 2;
      const invNo = String(row["Invoice Number"] || "").trim();
      const custName = String(row["Customer Name"] || "").trim();
      const custPhone = String(row["Customer Phone"] || "").trim();

      if (!invNo) {
        errors.push(`Row ${rowNum}: Missing Invoice Number.`);
        return;
      }
      if (!custName) {
        errors.push(`Row ${rowNum} (${invNo}): Missing Customer Name.`);
        return;
      }
      if (!custPhone) {
        warnings.push(`Row ${rowNum} (${invNo}): Missing Customer Phone.`);
      }

      const subtotal = Number(row["Subtotal (Rs)"]) || 0;
      const discount = Number(row["Discount (Rs)"]) || 0;
      const grandTotal = Number(row["Grand Total (Rs)"]) || subtotal - discount;
      const paidAmount = Number(row["Paid Amount (Rs)"]) || 0;
      const pendingAmount = Math.max(0, grandTotal - paidAmount);

      // Validate payment integrity formula
      if (paidAmount > grandTotal) {
        warnings.push(`Row ${rowNum} (${invNo}): Paid amount (Rs. ${paidAmount}) exceeds Grand Total (Rs. ${grandTotal}). Adjusted.`);
      }

      let status: "PAID" | "PARTIAL" | "PENDING" = "PENDING";
      if (paidAmount >= grandTotal) {
        status = "PAID";
        paidCount++;
      } else if (paidAmount > 0) {
        status = "PARTIAL";
        partialCount++;
      } else {
        status = "PENDING";
        pendingCount++;
      }

      totalGrand += grandTotal;
      totalPaid += paidAmount;
      totalPending += pendingAmount;

      // Match items or fallback default item
      let items = itemsByInvoice.get(invNo) || [];
      if (items.length === 0) {
        items = [
          {
            id: `item-${invNo}-default`,
            name: "Welding & Fabrication Work",
            quantity: 1,
            unit: "piece" as any,
            unitPrice: subtotal || grandTotal,
            total: subtotal || grandTotal,
          },
        ];
      }

      validatedInvoices.push({
        id: `imported-inv-${Date.now()}-${index}`,
        invoiceNumber: invNo,
        customerId: `cust-${custPhone || index}`,
        customerName: custName,
        customerPhone: custPhone || "9800000000",
        customerAddress: row["Customer Address"] ? String(row["Customer Address"]).trim() : undefined,
        customerGst: row["Customer GSTIN"] ? String(row["Customer GSTIN"]).trim() : undefined,
        date: row["Date"] ? String(row["Date"]).trim() : new Date().toISOString().split("T")[0],
        dueDate: row["Due Date"] ? String(row["Due Date"]).trim() : undefined,
        items,
        subtotal: subtotal || grandTotal,
        discountType: "fixed",
        discountValue: discount,
        discountAmount: discount,
        grandTotal,
        paidAmount: Math.min(grandTotal, paidAmount),
        pendingAmount,
        status,
        primaryPaymentMethod: (row["Primary Payment Mode"] as any) || "CASH",
        payments: [],
        notes: row["Notes"] ? String(row["Notes"]).trim() : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // Validated Customers
    const validatedCustomers: Customer[] = [];
    const customerMap = new Map<string, Customer>();

    customersRaw.forEach((row, idx) => {
      const phone = String(row["Phone"] || "").trim();
      const name = String(row["Customer Name"] || "").trim();
      if (!name || !phone) return;

      const cust: Customer = {
        id: `cust-${phone}`,
        name,
        phone,
        address: row["Address"] ? String(row["Address"]).trim() : undefined,
        gstNumber: row["GSTIN"] ? String(row["GSTIN"]).trim() : undefined,
        totalBills: Number(row["Total Bills"]) || 0,
        totalBilled: Number(row["Total Billed (Rs)"]) || 0,
        totalPaid: Number(row["Total Paid (Rs)"]) || 0,
        totalPending: Number(row["Total Pending (Rs)"]) || 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      customerMap.set(phone, cust);
    });

    // Auto-create missing customers from invoices
    validatedInvoices.forEach((inv) => {
      if (!customerMap.has(inv.customerPhone)) {
        customerMap.set(inv.customerPhone, {
          id: `cust-${inv.customerPhone}`,
          name: inv.customerName,
          phone: inv.customerPhone,
          address: inv.customerAddress,
          gstNumber: inv.customerGst,
          totalBills: 1,
          totalBilled: inv.grandTotal,
          totalPaid: inv.paidAmount,
          totalPending: inv.pendingAmount,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    validatedCustomers.push(...Array.from(customerMap.values()));

    // Validated Products
    const validatedProducts: Product[] = productsRaw.map((row, idx) => ({
      id: `prod-${Date.now()}-${idx}`,
      name: String(row["Product / Work Name"] || "").trim(),
      description: row["Description"] ? String(row["Description"]).trim() : undefined,
      category: row["Category"] ? String(row["Category"]).trim() : "FABRICATION",
      unit: (row["Unit"] as any) || "piece",
      defaultPrice: Number(row["Default Rate (Rs)"]) || 0,
      isActive: row["Active"] !== "NO",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })).filter((p) => p.name.length > 0);

    // Validated Payments
    const validatedPayments: PaymentRecord[] = paymentsRaw.map((row, idx) => {
      const invNo = String(row["Invoice Number"] || "").trim();
      const amount = Number(row["Amount (Rs)"]) || 0;
      return {
        id: String(row["Payment ID"] || `pay-${Date.now()}-${idx}`),
        invoiceId: `inv-${invNo}`,
        invoiceNumber: invNo,
        customerId: `cust-${String(row["Customer Phone"] || idx)}`,
        customerName: String(row["Customer Name"] || "Customer"),
        customerPhone: String(row["Customer Phone"] || "9800000000"),
        amount,
        paymentMethod: (row["Payment Method"] as any) || "CASH",
        referenceNote: row["Reference Note"] ? String(row["Reference Note"]).trim() : undefined,
        date: row["Date"] ? String(row["Date"]).trim() : new Date().toISOString().split("T")[0],
        time: row["Time"] ? String(row["Time"]).trim() : undefined,
        createdAt: new Date().toISOString(),
      };
    }).filter((p) => p.amount > 0);

    // Attach payments to respective invoices
    validatedPayments.forEach((pay) => {
      const inv = validatedInvoices.find((i) => i.invoiceNumber === pay.invoiceNumber);
      if (inv) {
        pay.invoiceId = inv.id;
        inv.payments.push(pay);
      }
    });

    const summary: BackupSummary = {
      invoicesCount: validatedInvoices.length,
      paidInvoicesCount: paidCount,
      partialInvoicesCount: partialCount,
      pendingInvoicesCount: pendingCount,
      customersCount: validatedCustomers.length,
      productsCount: validatedProducts.length,
      paymentsCount: validatedPayments.length,
      totalGrandTotal: totalGrand,
      totalCollected: totalPaid,
      totalOutstanding: totalPending,
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary,
      data: {
        invoices: validatedInvoices,
        customers: validatedCustomers,
        products: validatedProducts,
        payments: validatedPayments,
      },
    };
  }

  /**
   * 4. PREVIEW & 5. RESTORE DATABASE: Saves validated data to persistent repository & store
   */
  public async restoreDatabase(
    validatedData: ValidatedBackupData,
    mode: "replace" | "merge" = "replace"
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (mode === "replace") {
        storageService.saveInvoices(validatedData.invoices);
        storageService.saveCustomers(validatedData.customers);
        if (validatedData.products.length > 0) {
          storageService.saveProducts(validatedData.products);
        }
        storageService.savePayments(validatedData.payments);
      } else {
        // Merge mode
        const existingInvoices = storageService.getInvoices();
        const existingCustomers = storageService.getCustomers();
        const existingProducts = storageService.getProducts();
        const existingPayments = storageService.getPayments();

        // Merge Invoices by invoiceNumber
        const invMap = new Map<string, Invoice>();
        existingInvoices.forEach((i) => invMap.set(i.invoiceNumber, i));
        validatedData.invoices.forEach((i) => invMap.set(i.invoiceNumber, i));

        // Merge Customers by phone
        const custMap = new Map<string, Customer>();
        existingCustomers.forEach((c) => custMap.set(c.phone, c));
        validatedData.customers.forEach((c) => custMap.set(c.phone, c));

        // Merge Products by name
        const prodMap = new Map<string, Product>();
        existingProducts.forEach((p) => prodMap.set(p.name.toLowerCase(), p));
        validatedData.products.forEach((p) => prodMap.set(p.name.toLowerCase(), p));

        // Merge Payments by ID
        const payMap = new Map<string, PaymentRecord>();
        existingPayments.forEach((p) => payMap.set(p.id, p));
        validatedData.payments.forEach((p) => payMap.set(p.id, p));

        storageService.saveInvoices(Array.from(invMap.values()));
        storageService.saveCustomers(Array.from(custMap.values()));
        storageService.saveProducts(Array.from(prodMap.values()));
        storageService.savePayments(Array.from(payMap.values()));
      }

      // Recalculate customer statistics
      storageService.recalculateAllCustomerStats();

      return {
        success: true,
        message: `Successfully restored ${validatedData.invoices.length} invoices, ${validatedData.customers.length} customers, and ${validatedData.payments.length} payments to the database.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || "Failed to restore database from backup.",
      };
    }
  }
}

export const excelBackupService = new ExcelBackupService();
