import { createClient } from "@supabase/supabase-js";

// Το κλειδί service role παρακάμπτει τη RLS. Επιτρέπεται ΜΟΝΟ σε τρία σημεία (ADR 0016, ADR 0018):
// 1) τα routes των hooks (`src/app/api/hooks/`), 2) τα routes των cron (`src/app/api/cron/`),
// 3) το module Πρόσβασης, για τις ενέργειες πρόσκλησης και απενεργοποίησης (`auth.admin`).
// Τον έλεγχο στο `pnpm check:modules` τον κάνει ο κανόνας για το import αυτού του αρχείου.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
