import { NextResponse, type NextRequest } from "next/server";

import { isCronAuthorized } from "@/lib/email/outbox-trigger";
import { createAdminClient } from "@/lib/supabase/admin";

// Καθαρισμός 12 μηνών των Συζητήσεων Βοηθού (#192, Λεπτομέρειες #9): μία φορά τη μέρα (Vercel cron). Σβήνει τις Συζητήσεις με
// τελευταίο μήνυμα πριν από 12 μήνες, μαζί με τα μηνύματα και τις Αναπάντητες που ήρθαν μόνο από αυτές.
// Χωρίς CRON_SECRET: 500· με λάθος ή λείπον Bearer: 401. Σφάλμα της βάσης: 500 (φαίνεται στα logs του cron).
// Δεν γράφει στο job_runs: ο πίνακας δέχεται μόνο τις εργασίες «outbox» και «google», και ο έλεγχος Υγείας θεωρεί «χαμένη»
// κάθε εργασία που δεν πέτυχε τα τελευταία 10′, άρα μια ημερήσια εργασία θα σήμαινε ψευδή συναγερμό (βλ. PR #192).
export const maxDuration = 60;

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
  const { data, error } = await admin.rpc("assistant_purge", {});
  if (error) {
    console.error("assistant_purge", error.message);
    return NextResponse.json({ error: "purge failed" }, { status: 500 });
  }
  return NextResponse.json(data);
}
