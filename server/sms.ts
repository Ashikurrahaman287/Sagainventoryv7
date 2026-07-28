/**
 * SMS service — SwiftSMS (swiftsms.astgd.com)
 * Sends transactional SMS for new sales, payment received, and order delivered events.
 */

const API_KEY = process.env.SMS_API_KEY || "";
const BASE_URL = "https://swiftsms.astgd.com/api/sms";

export type SmsEvent = "new_sale" | "payment_received" | "order_delivered";

export interface SmsResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

const ERROR_MEANINGS: Record<number, string> = {
  1002: "Sender ID / Masking not found",
  1003: "API not found",
  1004: "SPAM detected",
  1005: "Internal error",
  1006: "Internal error",
  1007: "Balance insufficient",
  1008: "Message is empty",
  1009: "Message type not set",
  1010: "Invalid user & password",
  1011: "Invalid user ID",
  1012: "Invalid number",
  1013: "API limit error",
  1014: "No matching template",
  1015: "SMS content validation failed",
};

/** Normalise a BD number to 880XXXXXXXXXX format */
function normaliseNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return "880" + digits.slice(1);
  return "880" + digits;
}

/** Send a single SMS via SwiftSMS */
export async function sendSms(to: string, message: string): Promise<SmsResult> {
  if (!API_KEY) {
    return { success: false, error: "SMS_API_KEY is not configured" };
  }
  const number = normaliseNumber(to);
  try {
    const params = new URLSearchParams({
      apikey: API_KEY,
      phonenumber: number,
      message,
      label: "transactional",
    });
    const res = await fetch(`${BASE_URL}/send?${params.toString()}`);
    // API returns plain text — try JSON first, fall back to text
    const raw = await res.text();
    let body: any = null;
    try { body = JSON.parse(raw); } catch { /* plain text response */ }

    if (body !== null) {
      if (body.error_code === 0 || body.status === "success") {
        return { success: true, requestId: String(body.message_id ?? body.request_id ?? Date.now()) };
      }
      const meaning = ERROR_MEANINGS[body.error_code] ?? "Unknown error";
      return { success: false, error: `Error ${body.error_code}: ${meaning}` };
    }

    // Plain text: success if it looks like a numeric message ID or "success"
    const trimmed = raw.trim().toLowerCase();
    if (/^\d+$/.test(raw.trim()) || trimmed === "success" || trimmed.startsWith("submitted")) {
      return { success: true, requestId: raw.trim() };
    }
    // Map known plain-text error phrases to error codes
    const errCode = Object.entries({
      1007: "insufficient",
      1012: "invalid number",
      1008: "message is empty",
      1004: "spam",
    }).find(([, kw]) => trimmed.includes(kw));
    if (errCode) {
      const code = parseInt(errCode[0]);
      return { success: false, error: `Error ${code}: ${ERROR_MEANINGS[code]}` };
    }
    return { success: false, error: raw.trim() || "Unknown error from SwiftSMS" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Fetch current SMS balance from SwiftSMS */
export async function getSmsBalance(): Promise<{ balance: string } | null> {
  try {
    const res = await fetch(`${BASE_URL}/getbalance?apikey=${API_KEY}`);
    const raw = await res.text();
    // Response may be: {'available': 5, 'used': 2}  (Python-style) or valid JSON
    let body: any = null;
    try { body = JSON.parse(raw); } catch { /* not JSON */ }
    if (body === null) {
      // Replace single quotes → double quotes to make it valid JSON
      try { body = JSON.parse(raw.replace(/'/g, '"')); } catch { /* give up */ }
    }
    if (body?.available !== undefined) {
      return { balance: String(body.available) };
    }
    if (body?.balance !== undefined) {
      return { balance: String(body.balance) };
    }
    return null;
  } catch {
    return null;
  }
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
    `Dear ${opts.customerName}, payment of BDT ${opts.total} received for order ${opts.receiptNumber}. Thank you. UNDERGRADUATE HUB`
  );
}

export function orderDeliveredMessage(opts: {
  customerName: string;
  receiptNumber: string;
}): string {
  return truncate(
    `Dear ${opts.customerName}, your order ${opts.receiptNumber} has been delivered successfully. Thank you. UNDERGRADUATE HUB`
  );
}
