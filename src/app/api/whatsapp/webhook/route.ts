import { NextRequest, NextResponse } from "next/server";

// In-memory status store for recent message deliveries (keyed by WhatsApp message ID)
interface MessageStatusRecord {
  messageId: string;
  recipientId: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  updatedAt: string;
  errors?: any[];
}

const deliveryStore = new Map<string, MessageStatusRecord>();

/**
 * GET: Webhook verification endpoint for Meta WhatsApp Cloud API
 * Meta sends hub.mode, hub.verify_token, hub.challenge
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    process.env.WHATSAPP_VERIFY_TOKEN ||
    "jaimatadi_whatsapp_webhook_token_2026";

  // Check if mode and token were sent
  if (mode && token) {
    if (mode === "subscribe" && token === expectedToken) {
      console.log("[WhatsApp Webhook] Verification successful");
      return new NextResponse(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    } else {
      console.warn("[WhatsApp Webhook] Verification failed - token mismatch");
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // Optional: Allow checking status by message ID via query ?messageId=xxx
  const messageId = searchParams.get("messageId");
  if (messageId) {
    const record = deliveryStore.get(messageId);
    if (!record) {
      return NextResponse.json(
        { found: false, message: "No tracking record found for this message ID" },
        { status: 404 }
      );
    }
    return NextResponse.json({ found: true, record });
  }

  // Return list of recent delivery statuses (last 50)
  const recentRecords = Array.from(deliveryStore.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 50);

  return NextResponse.json({
    status: "active",
    recentStatuses: recentRecords,
    count: deliveryStore.size,
  });
}

/**
 * POST: Handles incoming webhook events from Meta (delivery statuses: sent, delivered, read, failed)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.object === "whatsapp_business_account") {
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (value?.statuses && Array.isArray(value.statuses)) {
            for (const statusObj of value.statuses) {
              const messageId = statusObj.id;
              const recipientId = statusObj.recipient_id;
              const status = statusObj.status; // "sent" | "delivered" | "read" | "failed"
              const timestamp = statusObj.timestamp
                ? new Date(parseInt(statusObj.timestamp, 10) * 1000).toISOString()
                : new Date().toISOString();

              const record: MessageStatusRecord = {
                messageId,
                recipientId,
                status,
                timestamp,
                updatedAt: new Date().toISOString(),
                errors: statusObj.errors,
              };

              deliveryStore.set(messageId, record);
              console.log(
                `[WhatsApp Webhook] Status update: Message ${messageId} to ${recipientId} is now "${status}"`
              );
            }
          }
        }
      }

      return NextResponse.json({ success: true, message: "Event received" }, { status: 200 });
    }

    return NextResponse.json({ success: false, message: "Not a WhatsApp event" }, { status: 404 });
  } catch (error: any) {
    console.error("[WhatsApp Webhook] Error processing event:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}
