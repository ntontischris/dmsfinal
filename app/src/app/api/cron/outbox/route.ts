import { NextResponse, type NextRequest } from "next/server";

import { runOutboxWorker } from "@/lib/email/worker";
import { isCronAuthorized } from "@/lib/email/outbox-trigger";
import { createAdminClient } from "@/lib/supabase/admin";

// Ο εργάτης της ουράς email: κάθε λεπτό (Vercel cron) και μετά από κάθε εγγραφή (σκούντημα).
// Μόνο με CRON_SECRET· χωρίς αυτό, 401.
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isCronAuthorized(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "service role missing" }, { status: 500 });
  const summary = await runOutboxWorker(admin, new URL(request.url).origin);
  return NextResponse.json(summary);
}
