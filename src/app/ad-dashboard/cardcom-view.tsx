"use client";

import { useState, useCallback } from "react";
import type { CardcomTransaction } from "./lib/cardcom-api";
import { GLASS } from "./lib/constants";
import { fmtCurrency } from "./lib/format";
import { getAccountConnection } from "./lib/account-connections";

// ─── Types ───────────────────────────────────────────────

interface CardcomCreds {
  terminalNumber: string;
  apiName: string;
  apiPassword: string;
}

interface DayComparison {
  date: string;
  cardcomRevenue: number;
  metaRevenue: number;
  diff: number;       // cardcom - meta
  diffPct: number;    // % gap
}

interface CardcomViewProps {
  onBack: () => void;
  accountId?: string;        // active Meta ad account (or "summary")
  accountName?: string;
  metaRevenueByDate?: Record<string, number>;
  metaTotalRevenue?: number;
  dateRangeLabel?: string;
}

const LS_KEY = "cardcom_creds";
const LS_EXCLUSIONS_KEY = "cardcom_exclusions";

function loadCreds(): CardcomCreds | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCreds(c: CardcomCreds) {
  localStorage.setItem(LS_KEY, JSON.stringify(c));
}

function removeCreds() {
  localStorage.removeItem(LS_KEY);
}

function loadExclusions(): string[] {
  try {
    const raw = localStorage.getItem(LS_EXCLUSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveExclusions(list: string[]) {
  localStorage.setItem(LS_EXCLUSIONS_KEY, JSON.stringify(list));
}

// ─── Connect Form ─────────────────────────────────────────

function ConnectForm({
  onConnected,
}: {
  onConnected: (creds: CardcomCreds) => void;
}) {
  const [terminalNumber, setTerminalNumber] = useState("");
  const [apiName, setApiName] = useState("");
  const [apiPassword, setApiPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ad-dashboard/cardcom/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terminalNumber, apiName, apiPassword }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error ?? "שגיאה בחיבור");
        return;
      }

      const creds: CardcomCreds = { terminalNumber, apiName, apiPassword };
      saveCreds(creds);
      onConnected(creds);
    } catch {
      setError("שגיאת רשת — בדוק חיבור לאינטרנט");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <div className={`${GLASS} rounded-2xl p-8`}>
        <div className="mb-6 text-center">
          <div className="mb-2 text-3xl">💳</div>
          <h2 className="text-xl font-bold text-gray-800">התחברות לקארדקום</h2>
          <p className="mt-1 text-sm text-gray-500">
            הפרטים נשמרים מקומית בדפדפן בלבד
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              מספר טרמינל
            </label>
            <input
              type="text"
              value={terminalNumber}
              onChange={(e) => setTerminalNumber(e.target.value)}
              placeholder="לדוגמה: 1000"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              שם API
            </label>
            <input
              type="text"
              value={apiName}
              onChange={(e) => setApiName(e.target.value)}
              placeholder="apiName מהגדרות קארדקום"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              סיסמת API
            </label>
            <input
              type="password"
              value={apiPassword}
              onChange={(e) => setApiPassword(e.target.value)}
              placeholder="apiPassword"
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-blue-400 focus:outline-none"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "מתחבר..." : "התחבר לקארדקום"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-gray-400">
          למצוא את הפרטים: הגדרות קארדקום → הגדרת חברה → ניהול מפתחות API
        </p>
      </div>
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`${GLASS} rounded-2xl p-5`}>
      <div className={`mb-1 text-xs font-semibold ${color}`}>{label}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-500">{sub}</div>}
    </div>
  );
}

// ─── Main View ────────────────────────────────────────────

export function CardcomView({
  onBack,
  accountId,
  accountName,
  metaRevenueByDate = {},
  metaTotalRevenue = 0,
  dateRangeLabel,
}: CardcomViewProps) {
  // If a specific account is active and has per-account Cardcom creds, use those
  const perAccountCreds =
    accountId && accountId !== "summary"
      ? (getAccountConnection(accountId).cardcom ?? null)
      : null;

  const [creds, setCreds] = useState<CardcomCreds | null>(
    () => perAccountCreds ?? loadCreds()
  );

  // date range
  const today = new Date();
  const firstOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(todayStr);

  const [transactions, setTransactions] = useState<CardcomTransaction[]>([]);
  const [byDate, setByDate] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [rawDebug, setRawDebug] = useState<unknown>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Exclusions
  const [exclusions, setExclusions] = useState<string[]>(() => loadExclusions());
  const [newExclusion, setNewExclusion] = useState("");

  const addExclusion = () => {
    const val = newExclusion.trim();
    if (!val || exclusions.includes(val)) return;
    const updated = [...exclusions, val];
    setExclusions(updated);
    saveExclusions(updated);
    setNewExclusion("");
    setFetched(false); // force re-fetch
  };

  const removeExclusion = (item: string) => {
    const updated = exclusions.filter((e) => e !== item);
    setExclusions(updated);
    saveExclusions(updated);
    setFetched(false);
  };

  const fetchData = useCallback(async () => {
    if (!creds) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ad-dashboard/cardcom/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...creds, fromDate, toDate, excludedDescriptions: exclusions }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "שגיאה בשליפת עסקאות");
        return;
      }

      setTransactions(data.transactions ?? []);
      setByDate(data.byDate ?? {});
      setTotal(data.total ?? 0);
      setRawDebug(data.rawResponse ?? null);
      setFetched(true);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [creds, fromDate, toDate, exclusions]);

  const handleDisconnect = () => {
    removeCreds();
    setCreds(null);
    setFetched(false);
    setTransactions([]);
  };

  // Build comparison rows
  const allDates = Array.from(
    new Set([...Object.keys(byDate), ...Object.keys(metaRevenueByDate)])
  ).sort();

  const comparison: DayComparison[] = allDates.map((date) => {
    const cardcom = byDate[date] ?? 0;
    const meta = metaRevenueByDate[date] ?? 0;
    const diff = cardcom - meta;
    const diffPct = meta > 0 ? (diff / meta) * 100 : 0;
    return { date, cardcomRevenue: cardcom, metaRevenue: meta, diff, diffPct };
  });

  const hasComparison = fetched && Object.keys(metaRevenueByDate).length > 0;

  if (!creds) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            ← חזרה
          </button>
          <h1 className="text-lg font-bold text-gray-800">קארדקום</h1>
        </div>
        <ConnectForm onConnected={setCreds} />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            ← חזרה
          </button>
          <h1 className="text-lg font-bold text-gray-800">
            💳 קארדקום — השוואת הכנסות
            {accountName && accountId !== "summary" && (
              <span className="mr-2 text-sm font-normal text-gray-500">· {accountName}</span>
            )}
          </h1>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          התנתק
        </button>
      </div>

      {/* Date range + fetch */}
      <div className={`${GLASS} flex flex-wrap items-end gap-4 rounded-2xl p-5`}>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">מתאריך</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">עד תאריך</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-all"
        >
          {loading ? "טוען..." : "🔄 שלוף עסקאות"}
        </button>
        <div className="text-xs text-gray-400">
          טרמינל: {creds.terminalNumber}
        </div>
      </div>

      {/* Exclusion filter */}
      <div className={`${GLASS} rounded-2xl p-5`}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700">סינון לקוחות מהחישוב</h2>
          <span className="text-xs text-gray-400">עסקאות שהתיאור שלהן מכיל את המילות המפתח יוסרו</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newExclusion}
            onChange={(e) => setNewExclusion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addExclusion()}
            placeholder='לדוגמה: "בדיקה" או שם לקוח לסינון'
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
          />
          <button
            onClick={addExclusion}
            disabled={!newExclusion.trim()}
            className="rounded-xl bg-gray-800 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-700 disabled:opacity-40"
          >
            + הוסף
          </button>
        </div>
        {exclusions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {exclusions.map((ex) => (
              <span
                key={ex}
                className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
              >
                {ex}
                <button
                  onClick={() => removeExclusion(ex)}
                  className="ml-1 text-red-400 hover:text-red-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {exclusions.length > 0 && (
          <p className="mt-2 text-xs text-gray-400">
            * לאחר שינוי הסינון לחץ על "שלוף עסקאות" מחדש
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      {fetched && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard
              label="הכנסה בקארדקום"
              value={fmtCurrency(total)}
              sub={`${transactions.length} עסקאות`}
              color="text-blue-600"
            />
            <SummaryCard
              label="הכנסה לפי Meta"
              value={fmtCurrency(metaTotalRevenue)}
              sub={dateRangeLabel ?? ""}
              color="text-indigo-600"
            />
            <SummaryCard
              label="פער (קארדקום − Meta)"
              value={fmtCurrency(total - metaTotalRevenue)}
              sub={
                metaTotalRevenue > 0
                  ? `${(((total - metaTotalRevenue) / metaTotalRevenue) * 100).toFixed(1)}%`
                  : undefined
              }
              color={total >= metaTotalRevenue ? "text-emerald-600" : "text-red-600"}
            />
            <SummaryCard
              label="יחס אימות"
              value={
                metaTotalRevenue > 0
                  ? `${((total / metaTotalRevenue) * 100).toFixed(0)}%`
                  : "—"
              }
              sub="קארדקום / Meta"
              color="text-amber-600"
            />
          </div>

          {/* Daily comparison table */}
          {hasComparison && (
            <div className={`${GLASS} rounded-2xl p-5`}>
              <h2 className="mb-4 text-sm font-bold text-gray-700">
                השוואה יומית — קארדקום vs Meta
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-500">
                      <th className="pb-2 text-right font-semibold">תאריך</th>
                      <th className="pb-2 text-left font-semibold">קארדקום</th>
                      <th className="pb-2 text-left font-semibold">Meta</th>
                      <th className="pb-2 text-left font-semibold">פער</th>
                      <th className="pb-2 text-left font-semibold">פער %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((row) => (
                      <tr
                        key={row.date}
                        className="border-b border-gray-50 hover:bg-gray-50/60"
                      >
                        <td className="py-2 text-right font-medium text-gray-700">
                          {row.date}
                        </td>
                        <td className="py-2 text-left font-semibold text-blue-700">
                          {fmtCurrency(row.cardcomRevenue)}
                        </td>
                        <td className="py-2 text-left text-indigo-600">
                          {fmtCurrency(row.metaRevenue)}
                        </td>
                        <td
                          className={`py-2 text-left font-semibold ${
                            row.diff > 0
                              ? "text-emerald-600"
                              : row.diff < 0
                              ? "text-red-600"
                              : "text-gray-400"
                          }`}
                        >
                          {row.diff > 0 ? "+" : ""}
                          {fmtCurrency(row.diff)}
                        </td>
                        <td
                          className={`py-2 text-left text-xs ${
                            row.diff > 0
                              ? "text-emerald-500"
                              : row.diff < 0
                              ? "text-red-500"
                              : "text-gray-400"
                          }`}
                        >
                          {row.metaRevenue > 0
                            ? `${row.diff > 0 ? "+" : ""}${row.diffPct.toFixed(1)}%`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!hasComparison && metaTotalRevenue === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
              💡 כדי לראות השוואה יומית מול Meta — סנכרן נתוני Meta קודם מהדאשבורד הראשי
            </div>
          )}

          {/* Transactions list */}
          <div className={`${GLASS} rounded-2xl p-5`}>
            <h2 className="mb-4 text-sm font-bold text-gray-700">
              עסקאות קארדקום ({transactions.length})
            </h2>
            {transactions.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-400">לא נמצאו עסקאות בטווח זה</p>
                {rawDebug && (
                  <div>
                    <button
                      onClick={() => setShowDebug(v => !v)}
                      className="text-xs text-blue-500 underline"
                    >
                      {showDebug ? "הסתר" : "הצג"} תגובה גולמית מקארדקום (לאבחון)
                    </button>
                    {showDebug && (
                      <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-gray-50 p-3 text-[10px] text-gray-600 border border-gray-200 text-left" dir="ltr">
                        {JSON.stringify(rawDebug as object, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-500">
                      <th className="pb-2 text-right font-semibold">תאריך</th>
                      <th className="pb-2 text-left font-semibold">סכום</th>
                      <th className="pb-2 text-right font-semibold">תיאור</th>
                      <th className="pb-2 text-right font-semibold">סטטוס</th>
                      <th className="pb-2 text-left font-semibold">4 ספרות</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, i) => (
                      <tr
                        key={t.transactionId || i}
                        className="border-b border-gray-50 hover:bg-gray-50/60"
                      >
                        <td className="py-2 text-right text-gray-600">{t.date}</td>
                        <td className="py-2 text-left font-semibold text-emerald-700">
                          {fmtCurrency(t.amount)}
                        </td>
                        <td className="py-2 text-right text-gray-500 text-xs max-w-[200px] truncate">
                          {t.description || "—"}
                        </td>
                        <td className="py-2 text-right text-xs text-gray-500">
                          {t.status || "—"}
                        </td>
                        <td className="py-2 text-left text-xs text-gray-400">
                          {t.last4Digits ? `****${t.last4Digits}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
