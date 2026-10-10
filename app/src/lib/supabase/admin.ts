import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Το κλειδί service role παρακάμπτει τη RLS. Επιτρέπεται ΜΟΝΟ σε αυτά τα αρχεία (κανόνας check:modules, ADR 0016):
// τα routes των hooks και του cron, ο worker της ουράς και οι ενέργειες πρόσβασης που χρειάζονται `auth.admin`.
export type AdminClient = SupabaseClient;

export function createAdminClient(): AdminClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
