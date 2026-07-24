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

export function newSaleMessage(opts: {
  customerName: string;
  receiptNumber: string;
  total: string;
  items: string;
}): string {
  return (
    `Dear ${opts.customerName}, your order has been placed successfully!\n` +
    `Receipt: ${opts.receiptNumber}\n` +
    `Items: ${opts.items}\n` +
    `Total: BDT ${opts.total}\n` +
    `Thank you for shopping with Undergraduate Hub!`
  );
}

export function paymentReceivedMessage(opts: {
  customerName: string;
  receiptNumber: string;
  total: string;
}): string {
  return (
    `Dear ${opts.customerName}, your payment of BDT ${opts.total} has been received.\n` +
    `Receipt: ${opts.receiptNumber}\n` +
    `Thank you! - Undergraduate Hub`
  );
}

export function orderDeliveredMessage(opts: {
  customerName: string;
  receiptNumber: string;
}): string {
  return (
    `Dear ${opts.customerName}, your order (${opts.receiptNumber}) has been successfully delivered.\n` +
    `Thank you for shopping with Undergraduate Hub!`
  );
}
