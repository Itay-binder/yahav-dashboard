import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/app/ad-dashboard/lib/session";
import { fetchCardcomTransactions, groupByDate } from "@/app/ad-dashboard/lib/cardcom-api";

export async function POST(request: NextRequest) {
  const session = await getSessionData();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { terminalNumber, apiName, apiPassword, fromDate, toDate } =
      await request.json();

    if (!terminalNumber || !apiName || !apiPassword || !fromDate || !toDate) {
      return NextResponse.json(
        { error: "חסרים פרטי התחברות או טווח תאריכים" },
        { status: 400 }
      );
    }

    const transactions = await fetchCardcomTransactions(
      { terminalNumber, apiName, apiPassword },
      fromDate,
      toDate
    );

    const byDate = groupByDate(transactions);
    const total = transactions.reduce((s, t) => s + t.amount, 0);

    return NextResponse.json({
      transactions,
      byDate,
      total,
      count: transactions.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "שגיאה בשליפת עסקאות";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
