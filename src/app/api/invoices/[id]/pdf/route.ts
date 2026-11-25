import { NextRequest, NextResponse } from "next/server";
import { pdfService } from "@/services/pdfService";
import { storageService } from "@/services/storageService";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const invoices = storageService.getInvoices();
    const invoice = invoices.find((inv) => inv.id === id || inv.invoiceNumber === id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const settings = storageService.getSettings();
    const pdfBuffer = pdfService.getInvoicePDFBuffer(invoice, settings);

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
