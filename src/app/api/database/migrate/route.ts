import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient, isServerSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message: "Customer Supabase credentials not configured in environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 400 }
      );
    }

    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, message: "Failed to initialize Supabase server client" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { settings, customers = [], products = [], invoices = [], payments = [] } = body;

    const migrationSummary = {
      settingsUpdated: false,
      customersMigrated: 0,
      productsMigrated: 0,
      invoicesMigrated: 0,
      itemsMigrated: 0,
      paymentsMigrated: 0,
    };

    // 1. Settings
    if (settings) {
      const { error: settingsErr } = await supabase.from("shop_settings").upsert({
        id: settings.id || "00000000-0000-0000-0000-000000000001",
        shop_name: settings.shopName,
        header_tradition: settings.headerTradition || "|| Shree ||",
        business_category: settings.businessCategory || "STEEL FURNITURE & RAILING",
        owner_name: settings.ownerName || "Mr. Vaibhav Wagh",
        shop_phone: settings.shopPhone,
        alt_phone: settings.altPhone,
        shop_address: settings.shopAddress,
        email: settings.email,
        gst_number: settings.gstNumber,
        upi_id: settings.upiId,
        invoice_prefix: settings.invoicePrefix || "INV-",
        next_invoice_number: settings.nextInvoiceNumber || 1007,
        terms_and_conditions: settings.termsAndConditions,
        invoice_footer_message: settings.invoiceFooterMessage,
        updated_at: new Date().toISOString(),
      });
      if (!settingsErr) migrationSummary.settingsUpdated = true;
    }

    // 2. Customers
    for (const c of customers) {
      const { error } = await supabase.from("customers").upsert({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email || null,
        address: c.address || null,
        gst_number: c.gstNumber || null,
        total_bills: c.totalBills || 0,
        total_billed: c.totalBilled || 0,
        total_paid: c.totalPaid || 0,
        total_pending: c.totalPending || 0,
        last_bill_date: c.lastBillDate ? new Date(c.lastBillDate).toISOString() : null,
        last_bill_number: c.lastBillNumber || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "phone" });
      if (!error) migrationSummary.customersMigrated++;
    }

    // 3. Products
    for (const p of products) {
      const { error } = await supabase.from("products").upsert({
        id: p.id,
        name: p.name,
        description: p.description || null,
        category: p.category || "FABRICATION",
        unit: p.unit || "sq ft",
        unit_price: p.defaultPrice || p.unitPrice || 0,
        is_active: p.isActive !== false,
        updated_at: new Date().toISOString(),
      });
      if (!error) migrationSummary.productsMigrated++;
    }

    // 4. Invoices & Items
    for (const inv of invoices) {
      // Ensure customer foreign key exists
      let customerId = inv.customerId;
      if (!customerId && inv.customerPhone) {
        const { data: foundCust } = await supabase
          .from("customers")
          .select("id")
          .eq("phone", inv.customerPhone)
          .single();
        if (foundCust) customerId = foundCust.id;
      }

      if (!customerId) {
        const { data: newCust } = await supabase.from("customers").insert({
          name: inv.customerName,
          phone: inv.customerPhone,
          address: inv.customerAddress,
        }).select("id").single();
        if (newCust) customerId = newCust.id;
      }

      if (customerId) {
        const { data: savedInv, error: invErr } = await supabase.from("invoices").upsert({
          id: inv.id,
          invoice_number: inv.invoiceNumber,
          customer_id: customerId,
          customer_name: inv.customerName,
          customer_phone: inv.customerPhone,
          customer_address: inv.customerAddress || null,
          customer_gst: inv.customerGst || null,
          date: inv.date ? new Date(inv.date).toISOString() : new Date().toISOString(),
          due_date: inv.dueDate ? new Date(inv.dueDate).toISOString() : null,
          primary_payment_method: inv.primaryPaymentMethod || "CASH",
          subtotal: inv.subtotal,
          discount_amount: inv.discountAmount || 0,
          tax_amount: 0,
          grand_total: inv.grandTotal,
          paid_amount: inv.paidAmount,
          pending_amount: inv.pendingAmount,
          status: inv.status,
          notes: inv.notes || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "invoice_number" }).select("id").single();

        if (!invErr && savedInv) {
          migrationSummary.invoicesMigrated++;

          // Upsert items
          if (Array.isArray(inv.items)) {
            for (const item of inv.items) {
              const { error: itemErr } = await supabase.from("invoice_items").upsert({
                id: item.id || undefined,
                invoice_id: savedInv.id,
                name: item.name,
                description: item.description || null,
                quantity: item.quantity,
                unit: item.unit || "nos",
                unit_price: item.unitPrice,
                total: item.total,
              });
              if (!itemErr) migrationSummary.itemsMigrated++;
            }
          }
        }
      }
    }

    // 5. Payments
    for (const pay of payments) {
      let invId = pay.invoiceId;
      if (!invId && pay.invoiceNumber) {
        const { data: invFound } = await supabase
          .from("invoices")
          .select("id, customer_id")
          .eq("invoice_number", pay.invoiceNumber)
          .single();
        if (invFound) {
          invId = invFound.id;
          if (!pay.customerId) pay.customerId = invFound.customer_id;
        }
      }

      if (invId && pay.customerId) {
        const { error: payErr } = await supabase.from("payments").upsert({
          id: pay.id,
          invoice_id: invId,
          customer_id: pay.customerId,
          amount: pay.amount,
          payment_method: pay.paymentMethod || "CASH",
          reference_note: pay.referenceNote || null,
          transaction_id: pay.transactionId || null,
          date: pay.date ? new Date(pay.date).toISOString() : new Date().toISOString(),
        });
        if (!payErr) migrationSummary.paymentsMigrated++;
      }
    }

    // 6. Log backup migration
    await supabase.from("backup_logs").insert({
      backup_type: "MIGRATION_TO_SUPABASE",
      filename: "local_state_sync",
      records_count: migrationSummary,
      status: "SUCCESS",
      notes: "Successfully synchronized local storage data to customer Supabase project",
    });

    return NextResponse.json({
      success: true,
      message: "Data successfully synchronized to customer Supabase database!",
      summary: migrationSummary,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Migration failed" },
      { status: 500 }
    );
  }
}
