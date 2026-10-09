import { NextResponse, type NextRequest } from "next/server";

import { appOrigin } from "@/lib/app-origin";
import { isCronAuthorized } from "@/lib/email/outbox-trigger";
import { runOutboxWorker } from "@/lib/email/worker";
import { createAdminClient } from "@/lib/supabase/admin";

// Ο εργάτης της ουράς email: κάθε λεπτό (Vercel cron) και μετά από κάθε εγγραφή (σκούντημα).
// Χωρίς CRON_SECRET στο περιβάλλον: 500· με λάθος ή λείπον Bearer: 401.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "cron not configured" }, { status: 500 });
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "service role missing" }, { status: 500 });
  const summary = await runOutboxWorker(admin, appOrigin());
  return NextResponse.json(summary);
}
