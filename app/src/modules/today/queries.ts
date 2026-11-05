import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import {
  parseCardData,
  parseTodayCounts,
  parseTodayMoney,
  parseTodayProgramme,
  parseTodayTeam,
  type CardData,
  type TodayCounts,
  type TodayMoney,
  type TodayProgramme,
  type TodayTeam,
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

// Τα κομμάτια της ενημέρωσης (#241): null = ο θεατής δεν έχει το Δικαίωμα (42501).
export async function getTodayMoney(): Promise<ReadResult<TodayMoney | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getTodayMoney", supabase.rpc("today_money"), parseTodayMoney);
}

export async function getTodayTeam(): Promise<ReadResult<TodayTeam | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getTodayTeam", supabase.rpc("today_team"), parseTodayTeam);
}

// day: «ΕΕΕΕ-ΜΜ-ΗΗ», μέρα Αθήνας.
export async function getTodayProgramme(
  day: string,
): Promise<ReadResult<TodayProgramme | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getTodayProgramme",
    supabase.rpc("today_programme", { p_day: day }),
    parseTodayProgramme,
  );
}
