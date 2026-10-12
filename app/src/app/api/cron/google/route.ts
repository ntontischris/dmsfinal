import { NextResponse, type NextRequest } from "next/server";

import { appOrigin } from "@/lib/app-origin";
import { createGoogleCalendarApi } from "@/lib/google/client";
import { readGoogleConfig } from "@/lib/google/config";
import { runGoogleWorker } from "@/lib/google/worker";
import { isCronAuthorized } from "@/lib/email/outbox-trigger";
import { checkHealth, markJobEnd, markJobStart } from "@/lib/notifications/health";
import { createAdminClient } from "@/lib/supabase/admin";

// Το ίδιο cron με την ουρά email, κάθε λεπτό. Χωρίς CRON_SECRET: 500· με λάθος ή λείπον Bearer: 401.
// Χωρίς στοιχεία λογαριασμού Google ή ημερολόγιο: 200 με «skipped» και καμία κλήση στο Google.
// Υγεία (#174): κάθε εκτέλεση γράφει έναρξη/τέλος στο job_runs και ελέγχει το cron της ουράς (και χωρίς Google).
export const maxDuration = 60;
// Μέσα στα 60 δευτερόλεπτα του maxDuration μένουν 15 για να κλείσει ο γύρος και να αφεθεί το κλείδωμα.
const ROUND_BUDGET_MS = 45_000;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "cron not configured" }, { status: 500 });
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "service role missing" }, { status: 500 });
  await markJobStart(admin, "google");
  const health = await checkHealth(admin, "google");
  const config = readGoogleConfig();
  if (!config) {
    await markJobEnd(admin, "google", null);
    return NextResponse.json({ skipped: "not-configured", health });
  }
  try {
    const summary = await runGoogleWorker(admin, createGoogleCalendarApi(config), {
      origin: appOrigin(),
      forcePull: false,
      budgetMs: ROUND_BUDGET_MS,
    });
    await markJobEnd(admin, "google", null);
    return NextResponse.json({ ...summary, health });
  } catch (error) {
    await markJobEnd(admin, "google", error instanceof Error ? error.message : "Ο εργάτης του Google σταμάτησε");
    throw error;
  }
}
