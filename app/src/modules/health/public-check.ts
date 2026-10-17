import "server-only";

import { createClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/lib/supabase/config";

// Ο εξωτερικός έλεγχος (#215, Υ8): η βάση απαντά και η ουρά έτρεξε μέσα στα 10′; Με το δημόσιο κλειδί, χωρίς συνεδρία
// και χωρίς service role. Η health_ok() επιστρέφει μόνο boolean· οτιδήποτε άλλο (σφάλμα, άλλη τιμή) μετρά ως «όχι».
export async function isSystemHealthy(): Promise<boolean> {
  const config = supabaseConfig();
  if (!config) return false;
  const client = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const { data, error } = await client.rpc("health_ok", {});
    if (error) {
      console.error("health_ok", error.message);
      return false;
    }
    return data === true;
  } catch (error) {
    console.error("health_ok", error instanceof Error ? error.message : "unknown");
    return false;
  }
}
