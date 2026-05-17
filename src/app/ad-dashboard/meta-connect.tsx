"use client";

import { useState, useEffect } from "react";
import type { AdUser } from "./lib/types";
import { GLASS } from "./lib/constants";
import {
  loadSelectedAccountIds,
  saveSelectedAccountIds,
  getAccountConnection,
  setAccountConnection,
  type CardcomCreds,
} from "./lib/account-connections";

// ─── helpers ────────────────────────────────────────────────
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function StatusDot({ user }: { user: AdUser | null }) {
  if (!user || !user.hasValidToken)
    return <span className="inline-block h-3 w-3 rounded-full bg-gray-300" />;
  if (user.tokenExpiresAt === null)
    return <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />;
  const days = daysUntil(user.tokenExpiresAt);
  if (days !== null && days <= 7)
    return <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-amber-400" />;
  return <span className="inline-block h-3 w-3 rounded-full bg-emerald-500" />;
}

function ConnectionBadge({ user }: { user: AdUser | null }) {
  if (!user || !user.hasValidToken)
    return <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">לא מחובר</span>;
  if (user.tokenExpiresAt === null)
    return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">System User Token · ללא תפוגה</span>;
  const days = daysUntil(user.tokenExpiresAt);
  if (days !== null && days <= 0)
    return <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">טוקן פג תוקף</span>;
  if (days !== null && days <= 7)
    return <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">פג תוקף בעוד {days} ימים</span>;
  return <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">מחובר · {days} ימים נותרו</span>;
}

// ─── Per-account Cardcom settings ───────────────────────────
function AccountCardcomSection({ accountId, accountName }: { accountId: string; accountName: string }) {
  const saved = getAccountConnection(accountId).cardcom;
  const [open, setOpen] = useState(false);
  const [terminalNumber, setTerminalNumber] = useState(saved?.terminalNumber ?? "");
  const [apiName, setApiName] = useState(saved?.apiName ?? "");
  const [apiPassword, setApiPassword] = useState(saved?.apiPassword ?? "");
  const [saving, setSaving] = useState(false);
  const [saved2, setSaved2] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const hasCredentials = !!(saved?.terminalNumber && saved?.apiName);

  async function handleSave() {
    if (!terminalNumber || !apiName || !apiPassword) {
      setErr("נדרשים כל שלושת השדות");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/ad-dashboard/cardcom/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terminalNumber, apiName, apiPassword }),
      });
      const data = await res.json();
      if (!data.success) {
        setErr(data.error ?? "שגיאה בחיבור");
        return;
      }
      const creds: CardcomCreds = { terminalNumber, apiName, apiPassword };
      const conn = getAccountConnection(accountId);
      setAccountConnection(accountId, { ...conn, cardcom: creds });
      setSaved2(true);
      setTimeout(() => setSaved2(false), 2000);
    } catch {
      setErr("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  }

  function handleRemove() {
    const conn = getAccountConnection(accountId);
    delete conn.cardcom;
    setAccountConnection(accountId, conn);
    setTerminalNumber("");
    setApiName("");
    setApiPassword("");
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-gray-700"
      >
        <div className="flex items-center gap-2">
          <span>💳 Cardcom</span>
          {hasCredentials && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-600">מחובר · טרמינל {saved?.terminalNumber}</span>
          )}
          {!hasCredentials && <span className="text-gray-400 font-normal">לא מוגדר</span>}
        </div>
        <svg className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
          <p className="text-xs text-gray-500 mb-2">
            פרטי Cardcom שישמשו להשוואת הכנסות עבור חשבון &quot;{accountName}&quot;
          </p>
          <input
            type="text"
            value={terminalNumber}
            onChange={(e) => setTerminalNumber(e.target.value)}
            placeholder="מספר טרמינל"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-blue-400 focus:outline-none"
            dir="ltr"
          />
          <input
            type="text"
            value={apiName}
            onChange={(e) => setApiName(e.target.value)}
            placeholder="שם API"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-blue-400 focus:outline-none"
            dir="ltr"
          />
          <input
            type="password"
            value={apiPassword}
            onChange={(e) => setApiPassword(e.target.value)}
            placeholder="סיסמת API"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs focus:border-blue-400 focus:outline-none"
            dir="ltr"
          />
          {err && <p className="text-xs text-red-600">❌ {err}</p>}
          {saved2 && <p className="text-xs text-emerald-600">✅ נשמר</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "בודק..." : "שמור"}
            </button>
            {hasCredentials && (
              <button
                onClick={handleRemove}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:border-red-300 hover:text-red-600"
              >
                הסר
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Account selector list ───────────────────────────────────
interface MetaAccount { id: string; name: string }

function AccountsPanel({ onSelectionChange }: { onSelectionChange?: (ids: string[]) => void }) {
  const [accounts, setAccounts] = useState<MetaAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => loadSelectedAccountIds() ?? []);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ad-dashboard/accounts")
      .then((r) => r.json())
      .then((d) => {
        if (d.accounts) {
          setAccounts(d.accounts);
          // default: all selected if nothing saved yet
          if (loadSelectedAccountIds() === null) {
            const all = d.accounts.map((a: MetaAccount) => a.id);
            setSelectedIds(all);
            saveSelectedAccountIds(all);
          }
        } else {
          setErr(d.error ?? "שגיאה בטעינת חשבונות");
        }
      })
      .catch(() => setErr("שגיאת רשת"))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    setSelectedIds(next);
    saveSelectedAccountIds(next);
    onSelectionChange?.(next);
  }

  function selectAll() {
    const all = accounts.map((a) => a.id);
    setSelectedIds(all);
    saveSelectedAccountIds(all);
    onSelectionChange?.(all);
  }

  if (loading) return <div className="py-4 text-center text-xs text-gray-400">טוען חשבונות...</div>;
  if (err) return <div className="py-3 text-xs text-red-600">❌ {err}</div>;
  if (accounts.length === 0) return <div className="py-3 text-xs text-gray-400">לא נמצאו חשבונות פרסום</div>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{selectedIds.length}/{accounts.length} חשבונות נבחרו</span>
        <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">בחר הכל</button>
      </div>
      {accounts.map((acc) => {
        const isSelected = selectedIds.includes(acc.id);
        const isExpanded = expandedId === acc.id;
        return (
          <div key={acc.id} className={`rounded-xl border transition-colors ${isSelected ? "border-blue-200 bg-blue-50/40" : "border-gray-100 bg-white/40"}`}>
            {/* Account row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggle(acc.id)}
                className="h-4 w-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                id={`acc-${acc.id}`}
              />
              <label htmlFor={`acc-${acc.id}`} className="flex-1 cursor-pointer">
                <div className="text-sm font-medium text-gray-800">{acc.name}</div>
                <div className="text-xs text-gray-400 font-mono">{acc.id}</div>
              </label>
              {isSelected && (
                <button
                  onClick={() => setExpandedId(isExpanded ? null : acc.id)}
                  className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1"
                >
                  חיבורים
                  <svg className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Per-account connections */}
            {isSelected && isExpanded && (
              <div className="border-t border-blue-100 px-4 pb-4 pt-3 space-y-2">
                <AccountCardcomSection accountId={acc.id} accountName={acc.name} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────
export function MetaConnectPanel({ user }: { user: AdUser | null }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenSubmitting, setTokenSubmitting] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenSuccess, setTokenSuccess] = useState(false);

  async function handleTokenSubmit() {
    const token = tokenInput.trim();
    if (!token) { setTokenError("הדבק System User Token לפני שמירה"); return; }
    setTokenSubmitting(true);
    setTokenError(null);
    try {
      const res = await fetch("/api/ad-dashboard/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) { setTokenError(data.error || "שמירת הטוקן נכשלה"); return; }
      setTokenSuccess(true);
      try { localStorage.removeItem("ad-dashboard-cache"); } catch { /* ignore */ }
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : "שגיאת רשת");
    } finally {
      setTokenSubmitting(false);
    }
  }

  async function handleDisconnect() {
    await fetch("/api/ad-dashboard/auth/logout", { method: "POST" });
    window.location.href = "/ad-dashboard/login";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8" dir="rtl">
      {/* ── Status card ── */}
      <div className={`${GLASS} rounded-2xl p-6`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-bold text-lg">f</div>
            <div>
              <div className="flex items-center gap-2">
                <StatusDot user={user} />
                <span className="font-semibold text-gray-900 text-sm">{user?.name ?? "Meta Business Manager"}</span>
              </div>
              {user?.email && <p className="mt-0.5 text-xs text-gray-500">{user.email}</p>}
              <div className="mt-1"><ConnectionBadge user={user} /></div>
            </div>
          </div>
          {user && (
            <button
              onClick={handleDisconnect}
              className="shrink-0 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-500 transition-all hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              התנתק
            </button>
          )}
        </div>
      </div>

      {/* ── OAuth button (not connected) ── */}
      {!user && (
        <div className={`${GLASS} rounded-2xl p-6`}>
          <h3 className="mb-1 text-sm font-semibold text-gray-900">התחבר עם Meta</h3>
          <p className="mb-4 text-xs text-gray-500">התחברות מאובטחת דרך OAuth · מקבל גישה לחשבונות הפרסום שלך</p>
          <a
            href="/api/ad-dashboard/auth/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1877F2] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#166fe5] active:scale-95"
          >
            <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            התחבר עם Facebook
          </a>
        </div>
      )}

      {/* ── Account selector (connected) ── */}
      {user && (
        <div className={`${GLASS} rounded-2xl p-6`}>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900">חשבונות פרסום</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              בחר אילו חשבונות יוצגו בדאשבורד · לכל חשבון ניתן לשייך חיבור Cardcom נפרד
            </p>
          </div>
          <AccountsPanel />
          <p className="mt-3 text-xs text-gray-400">* השינויים ייכנסו לתוקף בריענון הדף הבא</p>
        </div>
      )}

      {/* ── Advanced / System User Token ── */}
      <div className={`${GLASS} rounded-2xl`}>
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-sm font-semibold text-gray-700"
        >
          <span>הגדרות מתקדמות · System User Token</span>
          <svg className={`h-4 w-4 text-gray-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showAdvanced && (
          <div className="border-t border-white/30 px-6 pb-6 pt-4 space-y-4">
            <p className="text-xs font-medium text-gray-700">
              System User Token <span className="font-normal text-gray-500">(ללא תפוגה — מתאים לייצור)</span>
            </p>
            <p className="text-xs text-gray-500">
              צור System User ב-Business Manager שלך, הענק לו הרשאות לחשבונות הפרסום, ולחץ על "Generate Token".
            </p>
            <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="inline-block text-xs text-blue-600 underline hover:text-blue-800">
              Business Manager → System Users ↗
            </a>
            <textarea
              value={tokenInput}
              onChange={(e) => { setTokenInput(e.target.value); setTokenError(null); setTokenSuccess(false); }}
              disabled={tokenSubmitting}
              placeholder="EAAx... (System User Access Token)"
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-white/70 p-3 font-mono text-xs text-gray-900 focus:border-blue-400 focus:bg-white focus:outline-none disabled:opacity-50"
              dir="ltr"
            />
            {tokenError && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">❌ {tokenError}</div>}
            {tokenSuccess && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">✅ הטוקן נשמר · מרענן...</div>}
            <div className="flex justify-end">
              <button
                onClick={handleTokenSubmit}
                disabled={tokenSubmitting || !tokenInput.trim()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
              >
                {tokenSubmitting ? "מאמת..." : "שמור טוקן"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
