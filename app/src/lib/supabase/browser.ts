import { createBrowserClient } from "@supabase/ssr";

import { supabaseConfig } from "@/lib/supabase/config";

// Ο client του Supabase στον browser, με τη συνεδρία του Χρήστη από τα cookies (π.χ. για Realtime).
// Επιστρέφει null όταν η βάση δεν έχει συνδεθεί.
export function createBrowserSupabase() {
  const config = supabaseConfig();
  return config ? createBrowserClient(config.url, config.key) : null;
}
