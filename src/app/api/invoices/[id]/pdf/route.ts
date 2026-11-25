import { NextRequest, NextResponse } from "next/server";
import { pdfService } from "@/services/pdfService";
import { storageService } from "@/services/storageService";
import { verifyApiAuth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = verifyApiAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error || "Authentication required" },
        { status: 401 }
      );
    }

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
