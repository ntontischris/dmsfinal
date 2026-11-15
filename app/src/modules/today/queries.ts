import { cache } from "react";

import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import {
  parseCardData,
  parseSeenAt,
  parseSnoozed,
  parseTodayCounts,
  parseTodayKpis,
  parseTodayMoney,
  parseTodayProgramme,
  parseTodayTeam,
  type CardData,
  type TodayCounts,
  type TodayKpis,
  type TodayMoney,
  type TodayProgramme,
  type TodayTeam,
  type TodayVisit,
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

// Δείκτες και «ραντάρ κινδύνου» (d9). Η βάση κρύβει (null) όσους δεν επιτρέπει το Δικαίωμα του θεατή.
export async function getTodayKpis(): Promise<ReadResult<TodayKpis | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getTodayKpis", supabase.rpc("today_kpis"), parseTodayKpis);
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

// «Νέο» και «Αργότερα» (#241 Σ8): γράφει την επίσκεψη και διαβάζει τι κρύβεται. Μία φορά ανά αίτημα (cache): η σελίδα
// δεν πρέπει να «ξαναδεί» τον εαυτό της. Αν κάτι αποτύχει, απλώς κανένα «νέο» και κανένα «Αργότερα»· η Σήμερα δεν σπάει.
const NO_VISIT: TodayVisit = { seenAt: null, snoozed: [] };

async function readVisit(): Promise<TodayVisit> {
  const supabase = await createSupabase();
  if (!supabase) return NO_VISIT;
  const [seen, snoozed] = await Promise.all([
    read("markTodaySeen", supabase.rpc("today_mark_seen"), parseSeenAt),
    read("getTodaySnoozed", supabase.rpc("today_snoozed"), parseSnoozed),
  ]);
  return {
    seenAt: seen.ok ? seen.data : null,
    snoozed: snoozed.ok ? (snoozed.data ?? []) : [],
  };
}

export const getTodayVisit = cache(async (): Promise<TodayVisit> => {
  try {
    return await readVisit();
  } catch (error) {
    console.error("getTodayVisit:", error);
    return NO_VISIT;
  }
});
