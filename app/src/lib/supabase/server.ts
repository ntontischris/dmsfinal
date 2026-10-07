import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseConfig } from "@/lib/supabase/config";

// Ο client του Supabase για Server Components, server actions και route handlers, με τη συνεδρία του Χρήστη.
// Επιστρέφει null όταν η βάση δεν έχει συνδεθεί.
export async function createSupabase() {
  const config = supabaseConfig();
  if (!config) return null;
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Σε Server Component τα cookies δεν γράφονται· τα ανανεώνει το proxy σε κάθε αίτημα.
        }
      },
    },
  });
}
