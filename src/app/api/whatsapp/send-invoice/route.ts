import { NextRequest, NextResponse } from "next/server";
import { formatCurrency, sanitizePhone } from "@/lib/utils";
import { pdfService } from "@/services/pdfService";
import { storageService } from "./../../../../services/storageService";
import { Invoice } from "@/types";
import { verifyApiAuth } from "@/lib/auth";
import { getOrGenerateInvoiceSignedUrl } from "@/lib/supabase/storage";

/**
 * Sanitizes any secret tokens from error strings so secrets never leak
 */
function sanitizeSecrets(text: string): string {
  if (!text) return "";
  return text
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, "Bearer [REDACTED]")
    .replace(/EAAB[a-zA-Z0-9_\-\.]+/gi, "[REDACTED_META_TOKEN]")
    .replace(/access_token=[a-zA-Z0-9_\-\.]+/gi, "access_token=[REDACTED]");
}

/**
 * Maps Meta API errors to structured safe descriptions and corrective actions
 */
function mapMetaError(metaError: any, httpStatus: number) {
  const code = metaError?.code;
  const subcode = metaError?.error_subcode;
  const rawMsg = sanitizeSecrets(metaError?.message || "");

  let safeError = rawMsg || "Meta WhatsApp Cloud API request failed.";
  let suggestedAction =
    "Verify your Meta WhatsApp Business API configuration in the Meta Developer Portal.";

  if (code === 190) {
    safeError = "Meta Access Token is invalid, expired, or has been revoked.";
    suggestedAction =
      "Generate a new permanent System User Access Token in Meta Business Manager and update WHATSAPP_ACCESS_TOKEN in .env.local.";
  } else if (code === 100) {
    safeError = "Invalid parameter or Phone Number ID.";
    suggestedAction =
      "Check that WHATSAPP_PHONE_NUMBER_ID is correct and matches your WhatsApp Business account in Meta Developer Portal.";
  } else if (code === 131030) {
    safeError =
      "Recipient phone number is not registered in the Meta Sandbox test recipient list.";
    suggestedAction =
      "Add this mobile number to the 'To' list in Meta App Dashboard -> WhatsApp -> API Setup, or verify the number is active on WhatsApp.";
  } else if (code === 131047 || code === 131051) {
    safeError = "24-Hour Customer Service Messaging Window is closed.";
    suggestedAction =
      "The customer has not messaged your WhatsApp number in the last 24 hours. Ask the customer to send a message on WhatsApp first, or configure an approved document-header template (WHATSAPP_DOCUMENT_TEMPLATE_NAME).";
  } else if (code === 130429) {
    safeError = "Meta Cloud API rate limit exceeded.";
    suggestedAction = "Too many messages sent. Please wait 1-2 minutes before retrying.";
  } else if (code === 131026) {
    safeError = "Message failed to deliver to recipient.";
    suggestedAction =
      "Verify the recipient phone number is active on WhatsApp and has not blocked your business account.";
  }

  return {
    httpStatus,
    metaErrorCode: code,
    metaErrorSubcode: subcode,
    errorType: metaError?.type || "OAuthException",
    safeError,
    suggestedAction,
    fbtrace_id: metaError?.fbtrace_id,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Defense-in-depth: Verify shop authorization
    const auth = verifyApiAuth(request);
    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: false,
          httpStatus: 401,
          errorType: "UNAUTHORIZED",
          safeError: auth.error || "Authentication required. Please log in.",
          suggestedAction: "Please log in to your shop owner account before sending WhatsApp invoices.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      invoiceId,
      invoiceNumber,
      customerName,
      customerPhone,
      customerMobile,
      grandTotal,
      paidAmount,
      pendingAmount,
      status: propStatus,
      items,
      pdfBase64,
    } = body;

    const targetPhone = customerMobile || customerPhone;

    // 1. Mobile number validation (Indian format /^[6-9]\d{9}$/)
    if (!targetPhone) {
      return NextResponse.json(
        {
          success: false,
          httpStatus: 400,
          errorType: "VALIDATION_ERROR",
          safeError: "Customer mobile number is required.",
          suggestedAction: "Please provide a valid 10-digit Indian WhatsApp mobile number.",
        },
        { status: 400 }
      );
    }

    const cleanNumber = sanitizePhone(targetPhone);
    if (!/^[6-9]\d{9}$/.test(cleanNumber)) {
      return NextResponse.json(
        {
          success: false,
          httpStatus: 400,
          errorType: "VALIDATION_ERROR",
          safeError: "Invalid Indian mobile number. Must be a 10-digit number starting with 6, 7, 8, or 9.",
          suggestedAction: "Please check the customer's mobile number format before sending.",
        },
        { status: 400 }
      );
    }

    const fullNumber = `91${cleanNumber}`;
    const invNo = (invoiceNumber || "INV-BILL").trim();
    const firstName = customerName ? customerName.split(" ")[0] : "Customer";
    const total = Number(grandTotal) || 0;
    const paid = Number(paidAmount) || 0;
    const pending = typeof pendingAmount === "number" ? pendingAmount : Math.max(0, total - paid);

    const paymentStatus =
      propStatus || (pending === 0 ? "PAID" : paid > 0 ? "PARTIAL" : "PENDING");

    // Caption in English
    let caption = `Hello ${firstName},

Thank you for your business with JAI MATA DI STEEL FURNITURE & RAILING (Mr. Vaibhav Wagh, Mobile: 9561482326).

Please find your official tax invoice document #${invNo} attached.

• Invoice Number: ${invNo}
• Payment Status: ${paymentStatus}
• Total Amount: ${formatCurrency(total)}
• Amount Paid: ${formatCurrency(paid)}
• Balance Due: ${formatCurrency(pending)}`;

    if (pending > 0) {
      caption += `\n\nScan QR or Pay via UPI: 9561482326@ybl (Payable: ${formatCurrency(pending)})`;
    } else {
      caption += `\n\nPayment Status: PAID – NO PAYMENT DUE. Account settled in full.`;
    }

    caption += `\n\nNaggaon Road, Bodwad, Dist. Jalgaon. Thank you!`;

    const cleanCustomerName = (customerName || "Customer")
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "_");
    const documentFilename = `${invNo}_${cleanCustomerName}.pdf`;

    // 2. Validate all Meta WhatsApp Business Cloud API environment variables server-side
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0";
    const templateName = process.env.WHATSAPP_DOCUMENT_TEMPLATE_NAME;

    const missingCreds: string[] = [];
    if (!accessToken) missingCreds.push("WHATSAPP_ACCESS_TOKEN");
    if (!phoneNumberId) missingCreds.push("WHATSAPP_PHONE_NUMBER_ID");
    if (!businessAccountId) missingCreds.push("WHATSAPP_BUSINESS_ACCOUNT_ID");

    // If credentials are NOT configured, provide helpful configuration status and 2-step manual workflow
    if (missingCreds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          mode: "needs_configuration",
          httpStatus: 200,
          missingCredentials: missingCreds,
          requiredEnv: missingCreds,
          message:
            "WhatsApp Business Cloud API credentials are not yet configured on this server.",
          safeError: `Missing required environment variables: ${missingCreds.join(", ")}`,
          suggestedAction:
            "Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_BUSINESS_ACCOUNT_ID in .env.local.",
          messageType: "document",
          documentFilename,
          invoiceNumber: invNo,
          customerPhone: fullNumber,
          caption,
        },
        { status: 200 }
      );
    }

    // 3. Generate or retrieve actual invoice PDF Buffer
    let pdfBuffer: Buffer;
    if (pdfBase64 && pdfBase64.includes(",")) {
      pdfBuffer = Buffer.from(pdfBase64.split(",")[1], "base64");
    } else if (pdfBase64) {
      pdfBuffer = Buffer.from(pdfBase64, "base64");
    } else {
      // Reconstruct invoice object and generate PDF Buffer
      const constructedInvoice: Invoice = {
        id: invoiceId || `inv-${Date.now()}`,
        invoiceNumber: invNo,
        customerId: `cust-${Date.now()}`,
        customerName: customerName || "Customer",
        customerPhone: cleanNumber,
        date: new Date().toISOString().split("T")[0],
        items: items || [
          {
            id: "item-1",
            name: "Fabrication Work",
            quantity: 1,
            unit: "piece",
            unitPrice: total,
            total: total,
          },
        ],
        subtotal: total,
        discountType: "fixed",
        discountValue: 0,
        discountAmount: 0,
        grandTotal: total,
        paidAmount: paid,
        pendingAmount: pending,
        status: paymentStatus as any,
        primaryPaymentMethod: "CASH",
        payments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      pdfBuffer = pdfService.getInvoicePDFBuffer(constructedInvoice);
    }

    // Optional: Upload to private Supabase storage and create secure 7-day signed URL
    let signedInvoiceUrl: string | null = null;
    try {
      signedInvoiceUrl = await getOrGenerateInvoiceSignedUrl(invNo, pdfBuffer);
      if (signedInvoiceUrl) {
        caption += `\n\nDirect PDF Link (Valid for 7 days): ${signedInvoiceUrl}`;
      }
    } catch {
      // Graceful fallback: Meta Media upload will deliver the document directly
    }

    // 4. Step 1: Upload the PDF document to Meta Media API
    const formData = new FormData();
    const pdfBlob = new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" });
    formData.append("file", pdfBlob, documentFilename);
    formData.append("type", "application/pdf");
    formData.append("messaging_product", "whatsapp");

    const mediaUploadRes = await fetch(
      `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    const mediaData = await mediaUploadRes.json();

    if (!mediaUploadRes.ok || !mediaData?.id) {
      const errorDetails = mapMetaError(mediaData?.error, mediaUploadRes.status);
      return NextResponse.json(
        {
          success: false,
          mode: "error",
          stage: "media_upload",
          ...errorDetails,
          documentFilename,
          caption,
        },
        { status: mediaUploadRes.status >= 400 && mediaUploadRes.status < 500 ? mediaUploadRes.status : 502 }
      );
    }

    const mediaId = mediaData.id;

    // 5. Step 2: Send document message using returned media ID
    const messagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: fullNumber,
      type: "document",
      document: {
        id: mediaId,
        filename: documentFilename,
        caption: caption,
      },
    };

    const sendMessageRes = await fetch(
      `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const sendData = await sendMessageRes.json();

    // Check if message was accepted by Meta
    if (!sendMessageRes.ok || !sendData.messages?.[0]?.id) {
      const errorDetails = mapMetaError(sendData?.error, sendMessageRes.status);

      // Handle outside 24h window (Meta code 131047 / 131051) with approved template if configured
      if (
        (errorDetails.metaErrorCode === 131047 || errorDetails.metaErrorCode === 131051) &&
        templateName
      ) {
        try {
          const templatePayload = {
            messaging_product: "whatsapp",
            to: fullNumber,
            type: "template",
            template: {
              name: templateName,
              language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
              components: [
                {
                  type: "header",
                  parameters: [
                    {
                      type: "document",
                      document: {
                        id: mediaId,
                        filename: documentFilename,
                      },
                    },
                  ],
                },
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: customerName || "Customer" },
                    { type: "text", text: invNo },
                    { type: "text", text: formatCurrency(total) },
                  ],
                },
              ],
            },
          };

          const tplRes = await fetch(
            `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(templatePayload),
            }
          );
          const tplData = await tplRes.json();
          if (tplRes.ok && tplData.messages?.[0]?.id) {
            return NextResponse.json({
              success: true,
              mode: "cloud_api",
              usedTemplate: true,
              messageId: tplData.messages[0].id,
              documentFilename,
              message: `Invoice PDF document (${documentFilename}) dispatched successfully via approved template to +${fullNumber}.`,
            });
          }
        } catch {
          // fall through to returning errorDetails
        }
      }

      return NextResponse.json(
        {
          success: false,
          mode: "error",
          stage: "message_dispatch",
          ...errorDetails,
          documentFilename,
          caption,
        },
        { status: sendMessageRes.status >= 400 && sendMessageRes.status < 500 ? sendMessageRes.status : 502 }
      );
    }

    const messageId = sendData.messages[0].id;

    // 6. Return verified success
    return NextResponse.json({
      success: true,
      mode: "cloud_api",
      messageId: messageId,
      documentFilename,
      recipient: fullNumber,
      signedInvoiceUrl,
      message: `Invoice PDF document (${documentFilename}) dispatched successfully on WhatsApp to +${fullNumber}.`,
      status: "accepted_by_meta",
      data: {
        messaging_product: "whatsapp",
        messageId,
        signedInvoiceUrl,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        mode: "error",
        httpStatus: 500,
        safeError: sanitizeSecrets(error?.message || "Server error while processing WhatsApp PDF dispatch"),
        suggestedAction: "Please check application server logs and retry.",
      },
      { status: 500 }
    );
  }
}
