import { after, NextResponse, type NextRequest } from "next/server";

import { appOrigin } from "@/lib/app-origin";
import { createGoogleCalendarApi } from "@/lib/google/client";
import { readGoogleConfig } from "@/lib/google/config";
import { isChannelValid } from "@/lib/google/rpc";
import { runGoogleWorker } from "@/lib/google/worker";
import { createAdminClient } from "@/lib/supabase/admin";

// Ειδοποίηση του Google για αλλαγή στο ημερολόγιο. Το route είναι δημόσιο· το κανάλι ελέγχεται με το token του.
// Απάντηση 200 γρήγορα: ο συγχρονισμός τρέχει μετά την απάντηση (after). Λάθος token: 401.
export const maxDuration = 60;
const WEBHOOK_BUDGET_MS = 50_000;
const SYNC_MESSAGE = "sync";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const channelId = request.headers.get("x-goog-channel-id");
  const token = request.headers.get("x-goog-channel-token");
  const resourceState = request.headers.get("x-goog-resource-state");
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "service role missing" }, { status: 500 });
  if (!channelId || !token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const valid = await isChannelValid(admin, channelId, token).catch(() => null);
  if (valid === null) return NextResponse.json({ error: "check failed" }, { status: 500 });
  if (!valid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const config = readGoogleConfig();
  if (resourceState !== SYNC_MESSAGE && config) {
    const api = createGoogleCalendarApi(config);
    after(() => runGoogleWorker(admin, api, { origin: appOrigin(), forcePull: true, budgetMs: WEBHOOK_BUDGET_MS }).catch(() => console.error("google webhook: ο συγχρονισμός απέτυχε")));
  }
  return new NextResponse(null, { status: 200 });
}
