import { NextRequest, NextResponse } from "next/server";
import { getSessionData } from "@/app/ad-dashboard/lib/session";
import { testCardcomConnection } from "@/app/ad-dashboard/lib/cardcom-api";

export async function POST(request: NextRequest) {
  const session = await getSessionData();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { terminalNumber, apiName, apiPassword } = await request.json();

    if (!terminalNumber || !apiName || !apiPassword) {
      return NextResponse.json(
        { success: false, error: "נדרשים: מספר טרמינל, שם API, וסיסמת API" },
        { status: 400 }
      );
    }

    const result = await testCardcomConnection({ terminalNumber, apiName, apiPassword });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error });
    }

    return NextResponse.json({ success: true, terminalNumber, apiName });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "שגיאה בהתחברות";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
