import { NextResponse, type NextRequest } from "next/server";

import { isCronAuthorized } from "@/lib/email/outbox-trigger";
import { createAdminClient, type AdminClient } from "@/lib/supabase/admin";

// Καθαρισμός 12 μηνών των Συζητήσεων Βοηθού (#192, Λεπτομέρειες #9): μία φορά τη μέρα (Vercel cron). Σβήνει τις Συζητήσεις με
// τελευταίο μήνυμα πριν από 12 μήνες, μαζί με τα μηνύματα και τις Αναπάντητες που ήρθαν μόνο από αυτές.
// Χωρίς CRON_SECRET: 500· με λάθος ή λείπον Bearer: 401. Σφάλμα της βάσης: 500 (φαίνεται στα logs του cron).
// Γράφει στο job_runs (εργασία assistant_purge, #193): έναρξη, επιτυχία ή σφάλμα. Η Υγεία τη θεωρεί «χαμένη» μετά από 26 ώρες
// χωρίς επιτυχία (authz.health_job_grace).
export const maxDuration = 60;

async function mark(admin: AdminClient, ok: boolean | null, error: string | null): Promise<void> {
  const { error: rpcError } = await admin.rpc("job_run_mark", {
    p_job: "assistant_purge",
    p_ok: ok,
    p_error: error,
  });
  if (rpcError) console.error("job_run_mark", rpcError.message);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret)
    return NextResponse.json({ error: "cron not configured" }, { status: 500 });
  if (!isCronAuthorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin)
    return NextResponse.json(
      { error: "service role missing" },
      { status: 500 },
    );
  await mark(admin, null, null);
  const { data, error } = await admin.rpc("assistant_purge", {});
  if (error) {
    console.error("assistant_purge", error.message);
    await mark(admin, false, error.message);
    return NextResponse.json({ error: "purge failed" }, { status: 500 });
  }
  await mark(admin, true, null);
  return NextResponse.json(data);
}
