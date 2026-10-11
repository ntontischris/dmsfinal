import { NextResponse, type NextRequest } from "next/server";

import { appOrigin } from "@/lib/app-origin";
import { createGoogleCalendarApi } from "@/lib/google/client";
import { readGoogleConfig } from "@/lib/google/config";
import { runGoogleWorker } from "@/lib/google/worker";
import { isCronAuthorized } from "@/lib/email/outbox-trigger";
import { createAdminClient } from "@/lib/supabase/admin";

// Το ίδιο cron με την ουρά email, κάθε λεπτό. Χωρίς CRON_SECRET: 500· με λάθος ή λείπον Bearer: 401.
// Χωρίς στοιχεία λογαριασμού Google ή ημερολόγιο: 200 με «skipped» και καμία κλήση στο Google.
export const maxDuration = 60;
const ROUND_BUDGET_MS = 50_000;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "cron not configured" }, { status: 500 });
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "service role missing" }, { status: 500 });
  const config = readGoogleConfig();
  if (!config) return NextResponse.json({ skipped: "not-configured" });
  const summary = await runGoogleWorker(admin, createGoogleCalendarApi(config), {
    origin: appOrigin(),
    forcePull: false,
    budgetMs: ROUND_BUDGET_MS,
  });
  return NextResponse.json(summary);
}
