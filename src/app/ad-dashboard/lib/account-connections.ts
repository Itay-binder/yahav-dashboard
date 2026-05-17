// ─── Per-account integration connections ────────────────────
// Stored in localStorage under "account_connections"
// and selected account IDs under "selected_account_ids"

export interface CardcomCreds {
  terminalNumber: string;
  apiName: string;
  apiPassword: string;
}

export interface AccountConnection {
  cardcom?: CardcomCreds;
  // instagram and seo settings are managed by their own views;
  // we store only a label/note here for display purposes
  instagramNote?: string;
  seoNote?: string;
}

export type AccountConnectionsMap = Record<string, AccountConnection>;

const LS_CONNECTIONS = "account_connections";
const LS_SELECTED = "selected_account_ids";

export function loadAccountConnections(): AccountConnectionsMap {
  try {
    return JSON.parse(localStorage.getItem(LS_CONNECTIONS) || "{}");
  } catch {
    return {};
  }
}

export function getAccountConnection(accountId: string): AccountConnection {
  return loadAccountConnections()[accountId] ?? {};
}

export function setAccountConnection(accountId: string, conn: AccountConnection) {
  const all = loadAccountConnections();
  all[accountId] = conn;
  localStorage.setItem(LS_CONNECTIONS, JSON.stringify(all));
}

export function loadSelectedAccountIds(): string[] | null {
  try {
    const raw = localStorage.getItem(LS_SELECTED);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSelectedAccountIds(ids: string[]) {
  localStorage.setItem(LS_SELECTED, JSON.stringify(ids));
}
