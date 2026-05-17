// ═══════════════════════════════════════════════════════════
// Cardcom API v11 — Transaction fetching
// ═══════════════════════════════════════════════════════════

const BASE_URL = "https://secure.cardcom.solutions/api/v11";

export interface CardcomCredentials {
  terminalNumber: string;
  apiName: string;
  apiPassword: string;
}

export interface CardcomTransaction {
  transactionId: string;
  date: string;          // YYYY-MM-DD
  amount: number;
  status: string;
  description: string;
  last4Digits?: string;
  cardBrand?: string;
  approvalNumber?: string;
}

interface CardcomRawTransaction {
  TransactionId?: string | number;
  InternalDealNumber?: string | number;
  CreateDate?: string;
  TransactionDate?: string;
  Date?: string;
  Amount?: number | string;
  DealAmount?: number | string;
  TransactionAmount?: number | string;
  Status?: string | number;
  StatusDescription?: string;
  Description?: string;
  ProductName?: string;
  Last4Digits?: string;
  CardNumber?: string;
  CardBrand?: string;
  CardName?: string;
  ApprovalNumber?: string;
}

function parseDate(raw: string | undefined): string {
  if (!raw) return "";
  // Cardcom returns dates like "2024-01-15T12:34:56" or "15/01/2024"
  if (raw.includes("T")) return raw.split("T")[0];
  if (raw.includes("/")) {
    const [d, m, y] = raw.split("/");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return raw.substring(0, 10);
}

// Cardcom expects dates as ddmmyyyy
function toCardcomDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}${m}${y}`;
}

function normalizeTransaction(raw: CardcomRawTransaction): CardcomTransaction {
  const id = String(raw.TransactionId ?? raw.InternalDealNumber ?? "");
  const dateRaw = raw.CreateDate ?? raw.TransactionDate ?? raw.Date ?? "";
  const amount = parseFloat(String(raw.Amount ?? raw.DealAmount ?? raw.TransactionAmount ?? "0")) || 0;
  const status = raw.StatusDescription ?? String(raw.Status ?? "");
  const description = raw.Description ?? raw.ProductName ?? "";
  const last4 = raw.Last4Digits ?? raw.CardNumber ?? "";
  const brand = raw.CardBrand ?? raw.CardName ?? "";

  return {
    transactionId: id,
    date: parseDate(dateRaw),
    amount,
    status,
    description,
    last4Digits: last4,
    cardBrand: brand,
    approvalNumber: raw.ApprovalNumber,
  };
}

export async function fetchCardcomTransactions(
  creds: CardcomCredentials,
  fromDate: string,
  toDate: string,
  excludedDescriptions: string[] = []
): Promise<CardcomTransaction[]> {
  const payload = {
    TerminalNumber: parseInt(creds.terminalNumber, 10) || creds.terminalNumber,
    ApiName: creds.apiName,
    ApiPassword: creds.apiPassword,
    FromDate: toCardcomDate(fromDate),
    ToDate: toCardcomDate(toDate),
    Page: 1,
    Page_size: 500,
    TranStatus: "Success",
  };

  const res = await fetch(`${BASE_URL}/Transactions/ListTransactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cardcom API error: ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}`);
  }

  const data = await res.json();
  const transactions = extractTransactions(data);

  if (excludedDescriptions.length === 0) return transactions;

  const lower = excludedDescriptions.map((s) => s.toLowerCase().trim());
  return transactions.filter((t) => {
    const desc = (t.description ?? "").toLowerCase();
    return !lower.some((ex) => desc.includes(ex));
  });
}

function extractTransactions(data: unknown): CardcomTransaction[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;

  // Possible response shapes
  const list =
    (d.Transactions as CardcomRawTransaction[]) ??
    (d.transactions as CardcomRawTransaction[]) ??
    (d.Data as CardcomRawTransaction[]) ??
    (d.data as CardcomRawTransaction[]) ??
    (d.Items as CardcomRawTransaction[]) ??
    (d.items as CardcomRawTransaction[]) ??
    (Array.isArray(data) ? (data as CardcomRawTransaction[]) : null);

  if (!list || !Array.isArray(list)) return [];

  return list
    .map(normalizeTransaction)
    .filter((t) => t.amount > 0); // only successful charges
}

export async function testCardcomConnection(
  creds: CardcomCredentials
): Promise<{ ok: boolean; error?: string }> {
  try {
    const now = new Date();
    const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    await fetchCardcomTransactions(creds, from, to);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "שגיאה בהתחברות לקארדקום",
    };
  }
}

// Group transactions by date → total revenue per day
export function groupByDate(
  transactions: CardcomTransaction[]
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const t of transactions) {
    if (!t.date) continue;
    map[t.date] = (map[t.date] ?? 0) + t.amount;
  }
  return map;
}
