/**
 * SMS service — bulksmsbd.net
 * Sends transactional SMS for new sales, payment received, and order delivered events.
 */

const API_KEY = process.env.SMS_API_KEY || "";
const SENDER_ID = "8809617000000";
const BASE_URL = "http://bulksmsbd.net/api";

export type SmsEvent = "new_sale" | "payment_received" | "order_delivered";

export interface SmsResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

/** Normalise a BD number to 88017XXXXXXXX format */
function normaliseNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return "880" + digits.slice(1);
  return "880" + digits;
}

/** Send a single SMS via bulksmsbd.net */
export async function sendSms(to: string, message: string): Promise<SmsResult> {
  if (!API_KEY) {
    return { success: false, error: "SMS_API_KEY is not configured" };
  }
  const number = normaliseNumber(to);
  try {
    const params = new URLSearchParams({
      api_key: API_KEY,
      type: "text",
      number,
      senderid: SENDER_ID,
      message,
    });
    const res = await fetch(`${BASE_URL}/smsapi?${params.toString()}`, {
      method: "GET",
    });
    const json = await res.json() as any;
    // Success code from bulksmsbd is 202
    if (json.response_code === 202) {
      return { success: true, requestId: String(json.message_id ?? "") };
    }
    return {
      success: false,
      error: `Error ${json.response_code}: ${json.error_message ?? json.message ?? "Unknown error"}`,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Fetch current SMS balance from bulksmsbd.net */
export async function getSmsBalance(): Promise<{ balance: string } | null> {
  try {
    const res = await fetch(`${BASE_URL}/getBalanceApi?api_key=${API_KEY}`);
    const json = await res.json() as any;
    if (json.response_code === 202 && json.balance !== undefined) {
      return { balance: String(json.balance) };
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
