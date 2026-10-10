import { createClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/lib/supabase/config";

import type { IcsFeed } from "./ics";
import { read, type ReadResult } from "./read";
import { feedSchema } from "./view-schema";

// Το .ics δεν έχει συνεδρία: το token είναι η άδεια. Ο client είναι ανώνυμος και χωρίς αποθήκευση συνεδρίας.
// Ό,τι δεν είναι έγκυρο (ή σταματημένο) γυρνά null από τη βάση, χωρίς να ξεχωρίζει γιατί.
export async function getCalendarFeed(
  token: string,
): Promise<ReadResult<IcsFeed | null>> {
  const config = supabaseConfig();
  if (!config) return { ok: false };
  const anonymous = createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return read(
    "getCalendarFeed",
    anonymous.rpc("calendar_feed", { p_token: token }),
    (data) => feedSchema.parse(data),
  );
}
