import { NextResponse, type NextRequest } from "next/server";

import { isCronAuthorized } from "@/lib/email/outbox-trigger";
import { createAdminClient } from "@/lib/supabase/admin";

// Κανόνες Γυρισμάτων σε εκτέλεση (c6): κάθε 10 λεπτά (Vercel cron). Αναμένον Γύρισμα χωρίς απάντηση εγκρίνεται ή απορρίπτεται,
// και με «έγινε αυτόματα» το προγραμματισμένο κλείνει την επόμενη μέρα. Η βάση (filming_rules_apply) τα αποφασίζει όλα·
// με τους προεπιλεγμένους Κανόνες δεν αλλάζει τίποτα. Χωρίς CRON_SECRET: 500· με λάθος ή λείπον Bearer: 401.
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
  const { data, error } = await admin.rpc("filming_rules_apply", {});
  if (error) {
    console.error("filming_rules_apply", error.message);
    return NextResponse.json({ error: "rules failed" }, { status: 500 });
  }
  return NextResponse.json(data);
}
