/**
 * SMS service — Traccar SMS Gateway (Cloud Service)
 * Sends transactional SMS via the phone's SIM through Traccar's cloud relay.
 * Docs: https://www.traccar.org/sms-gateway/
 */

const CLOUD_TOKEN = process.env.SMS_API_KEY || "";
const CLOUD_URL = "https://sms.traccar.org/message";

export type SmsEvent = "new_sale" | "payment_received" | "order_delivered";

export interface SmsResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

/** Normalise a BD number to +880XXXXXXXXXX (E.164) format */
function normaliseNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) return "+" + digits;
  if (digits.startsWith("0")) return "+880" + digits.slice(1);
  return "+880" + digits;
}

/** Send a single SMS via Traccar SMS Gateway cloud */
export async function sendSms(to: string, message: string): Promise<SmsResult> {
  if (!CLOUD_TOKEN) {
    return { success: false, error: "SMS_API_KEY (Traccar cloud token) is not configured" };
  }
  const phone = normaliseNumber(to);
  try {
    const res = await fetch(CLOUD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${CLOUD_TOKEN}`,
      },
      body: JSON.stringify({ phone, message }),
    });

    if (res.ok) {
      return { success: true, requestId: `traccar-${Date.now()}` };
    }
    const text = await res.text().catch(() => res.statusText);
    return { success: false, error: `HTTP ${res.status}: ${text}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Traccar SMS Gateway has no balance API — it sends through the phone SIM.
 * Returns null so the SMS page gracefully hides the balance card.
 */
export async function getSmsBalance(): Promise<{ balance: string } | null> {
  return null;
}

// ── Templated messages ────────────────────────────────────────────────────────

const MAX_SMS = 160;

function truncate(text: string): string {
  return text.length > MAX_SMS ? text.slice(0, MAX_SMS) : text;
}

export function newSaleMessage(opts: {
  customerName: string;
  receiptNumber: string;
  total: string;
}): string {
  const firstName = opts.customerName.split(" ")[0];
  return truncate(
    `Dear ${firstName}, your order has been placed. Rcpt: ${opts.receiptNumber}. Total: BDT ${opts.total}. UNDERGRADUATE HUB`
  );
}

export function paymentReceivedMessage(opts: {
  customerName: string;
  receiptNumber: string;
  total: string;
}): string {
  return truncate(
    `Dear ${opts.customerName}, payment of BDT ${opts.total} received for order ${opts.receiptNumber}. Thank you. Undergraduate Hub`
  );
}

export function orderDeliveredMessage(opts: {
  customerName: string;
  receiptNumber: string;
}): string {
  return truncate(
    `Dear ${opts.customerName}, your order ${opts.receiptNumber} has been delivered successfully. Thank you. Undergraduate Hub`
  );
}
