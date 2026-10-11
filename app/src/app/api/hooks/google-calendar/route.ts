import { NextResponse, type NextRequest } from "next/server";

import { isChannelValid, requestPull } from "@/lib/google/rpc";
import { createAdminClient } from "@/lib/supabase/admin";

// Ειδοποίηση του Google για αλλαγή στο ημερολόγιο. Το route είναι δημόσιο· το κανάλι ελέγχεται με το token του.
// Δεν τρέχει τον worker: σημειώνει ότι χρειάζεται pull και απαντά 200· το επόμενο cron (έως 1 λεπτό) κάνει τη δουλειά.
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
  if (resourceState !== SYNC_MESSAGE) await requestPull(admin);
  return new NextResponse(null, { status: 200 });
}
