/**
 * SMS service — sms.net.bd
 * Sends transactional SMS for new sales, payment received, and order delivered events.
 */

const API_KEY = process.env.SMS_API_KEY || "";
const BASE_URL = "https://api.sms.net.bd";

export type SmsEvent = "new_sale" | "payment_received" | "order_delivered";

export interface SmsResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

/** Normalise a BD number to 880XXXXXXXXXX format */
function normaliseNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return "880" + digits.slice(1);
  return "880" + digits;
}

/** Send a single SMS via sms.net.bd POST endpoint */
export async function sendSms(to: string, message: string): Promise<SmsResult> {
  if (!API_KEY) {
    return { success: false, error: "SMS_API_KEY is not configured" };
  }
  const number = normaliseNumber(to);
  try {
    const body = new URLSearchParams({
      api_key: API_KEY,
      msg: message,
      to: number,
    });
    const res = await fetch(`${BASE_URL}/sendsms`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const json = await res.json() as any;
    if (json.error === 0) {
      return { success: true, requestId: String(json.data?.request_id ?? "") };
    }
    return { success: false, error: `API error ${json.error}: ${json.msg}` };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Fetch current SMS balance */
export async function getSmsBalance(): Promise<{ balance: string } | null> {
  try {
    const res = await fetch(`${BASE_URL}/user/balance/?api_key=${API_KEY}`);
    const json = await res.json() as any;
    if (json.error === 0) return { balance: json.data.balance };
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
  // Use only first name to keep within 160 chars
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
