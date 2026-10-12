import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import {
  parseCardData,
  parseTodayCounts,
  type CardData,
  type TodayCounts,
} from "./view-schema";

// Ανάγνωση της «Σήμερα». Όλα περνούν από RPC· η βάση αποφασίζει ποιες κάρτες επιτρέπονται.
// null = ο θεατής δεν έχει «Σήμερα» ή δεν βλέπει την κάρτα (42501).

export async function getTodayCounts(): Promise<ReadResult<TodayCounts | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getTodayCounts", supabase.rpc("today_counts"), parseTodayCounts);
}

export async function getTodayCard(
  code: string,
): Promise<ReadResult<CardData | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getTodayCard",
    supabase.rpc("today_card", { p_code: code }),
    parseCardData,
  );
}
