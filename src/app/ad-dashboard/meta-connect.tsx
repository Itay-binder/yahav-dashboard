"use client";

import { useState } from "react";
import type { AdUser } from "./lib/types";
import { GLASS } from "./lib/constants";

// ─── helpers ────────────────────────────────────────────────
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function StatusDot({ user }: { user: AdUser | null }) {
  if (!user || !user.hasValidToken) {
    return (
      <span className="inline-block h-3 w-3 rounded-full bg-gray-300 shadow-sm" />
    );
  }
  if (user.tokenExpiresAt === null) {
    // permanent system user token
    return (
      <span className="inline-block h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
    );
  }
  const days = daysUntil(user.tokenExpiresAt);
  if (days !== null && days <= 7) {
    return (
      <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-amber-400 shadow-sm shadow-amber-200" />
    );
  }
  return (
    <span className="inline-block h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
  );
}

function ConnectionBadge({ user }: { user: AdUser | null }) {
  if (!user || !user.hasValidToken) {
    return (
      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
        לא מחובר
      </span>
    );
  }
  if (user.tokenExpiresAt === null) {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
        System User Token · ללא תפוגה
      </span>
    );
  }
  const days = daysUntil(user.tokenExpiresAt);
  if (days !== null && days <= 0) {
    return (
      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
        טוקן פג תוקף
      </span>
    );
  }
  if (days !== null && days <= 7) {
    return (
      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        פג תוקף בעוד {days} ימים
      </span>
    );
  }
  return (
    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
      מחובר · {days} ימים נותרו
    </span>
  );
}

// ─── main component ──────────────────────────────────────────
export function MetaConnectPanel({ user }: { user: AdUser | null }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [tokenSubmitting, setTokenSubmitting] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenSuccess, setTokenSuccess] = useState(false);

  async function handleTokenSubmit() {
    const token = tokenInput.trim();
    if (!token) {
      setTokenError("הדבק System User Token לפני שמירה");
      return;
    }
    setTokenSubmitting(true);
    setTokenError(null);
    try {
      const res = await fetch("/api/ad-dashboard/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTokenError(data.error || "שמירת הטוקן נכשלה");
        return;
      }
      setTokenSuccess(true);
      try {
        localStorage.removeItem("ad-dashboard-cache");
      } catch {
        /* ignore */
      }
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white text-lg">
              f
            </div>
            <div>
              <div className="flex items-center gap-2">
                <StatusDot user={user} />
                <span className="font-semibold text-gray-900 text-sm">
                  {user?.name ?? "Meta Business Manager"}
                </span>
              </div>
              {user?.email && (
                <p className="mt-0.5 text-xs text-gray-500">{user.email}</p>
              )}
              <div className="mt-1">
                <ConnectionBadge user={user} />
              </div>
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

      {/* ── OAuth button ── */}
      {!user && (
        <div className={`${GLASS} rounded-2xl p-6`}>
          <h3 className="mb-1 text-sm font-semibold text-gray-900">
            התחבר עם Meta
          </h3>
          <p className="mb-4 text-xs text-gray-500">
            התחברות מאובטחת דרך OAuth · מקבל גישה לחשבונות הפרסום שלך
          </p>
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

      {/* ── Advanced / System User Token ── */}
      <div className={`${GLASS} rounded-2xl`}>
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-sm font-semibold text-gray-700"
        >
          <span>הגדרות מתקדמות · System User Token</span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="border-t border-white/30 px-6 pb-6 pt-4 space-y-4">
            <div>
              <p className="mb-1 text-xs font-medium text-gray-700">
                System User Token <span className="font-normal text-gray-500">(ללא תפוגה — מתאים לייצור)</span>
              </p>
              <p className="mb-3 text-xs text-gray-500">
                צור System User ב-Business Manager שלך, הענק לו הרשאות לחשבונות הפרסום, ולחץ על "Generate Token".
              </p>
              <a
                href="https://business.facebook.com/settings/system-users"
                target="_blank"
                rel="noopener noreferrer"
                className="mb-3 inline-block text-xs text-blue-600 underline hover:text-blue-800"
              >
                Business Manager → System Users ↗
              </a>
              <textarea
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setTokenError(null);
                  setTokenSuccess(false);
                }}
                disabled={tokenSubmitting}
                placeholder="EAAx... (System User Access Token)"
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white/70 p-3 font-mono text-xs text-gray-900 focus:border-blue-400 focus:bg-white focus:outline-none disabled:opacity-50"
                dir="ltr"
              />

              {tokenError && (
                <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  ❌ {tokenError}
                </div>
              )}
              {tokenSuccess && (
                <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  ✅ הטוקן נשמר · מרענן...
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleTokenSubmit}
                  disabled={tokenSubmitting || !tokenInput.trim()}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-40"
                >
                  {tokenSubmitting ? "מאמת..." : "שמור טוקן"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Info box ── */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-5 py-4 text-xs text-blue-800 space-y-1">
        <p className="font-medium">מה מתאפשר לאחר החיבור?</p>
        <ul className="mt-1 list-disc space-y-0.5 pr-4 text-blue-700">
          <li>שליפה אוטומטית של נתוני פרסום מ-Meta Ads Manager</li>
          <li>ניתוח ביצועים: הוצאה, לידים, ROI לפי יום</li>
          <li>גישה למספר חשבונות פרסום</li>
          <li>השוואה מול נתוני Cardcom</li>
        </ul>
      </div>
    </div>
  );
}
