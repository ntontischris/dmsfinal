"use server";

import { createSupabase } from "@/lib/supabase/server";

import {
  apantoDigest,
  egkrinoDigest,
  parseCardRead,
  parseInboxRead,
  type JobDigests,
} from "./digests";

type Rpc = PromiseLike<{
  data: unknown;
  error: { message: string; code?: string } | null;
}>;

// Μία ανάγνωση: 42501 (δεν έχει το Δικαίωμα) = τίποτα για αυτόν· άλλο σφάλμα καταγράφεται και μετρά ως τίποτα.
async function readOr<T>(
  label: string,
  query: Rpc,
  parse: (data: unknown) => T,
): Promise<T | null> {
  const { data, error } = await query;
  if (error && error.code !== "42501")
    console.error(`flows.${label}:`, error.message);
  if (error) return null;
  try {
    return parse(data);
  } catch (parseError) {
    console.error(`flows.${label}:`, parseError);
    return null;
  }
}

// Η ουρά «Τι πρέπει να κάνω τώρα» (prototype): οι ίδιες RPC που διαβάζουν τα Εισερχόμενα (J1) και οι κάρτες της
// Σήμερα. Μόνο ανάγνωση· η βάση αποφασίζει τι βλέπει ο θεατής.
export async function loadJobDigests(): Promise<JobDigests> {
  const at = Date.now();
  const supabase = await createSupabase();
  if (!supabase) return { at, jobs: [] };
  const card = (code: string) =>
    readOr(code, supabase.rpc("today_card", { p_code: code }), parseCardRead);
  const [inbox, requests, approvals, deletions] = await Promise.all([
    readOr("inbox", supabase.rpc("messages_inbox"), parseInboxRead),
    card("requests_mentions"),
    card("filming_approvals"),
    card("google_deletions"),
  ]);
  return {
    at,
    jobs: [apantoDigest(inbox, requests), egkrinoDigest(approvals, deletions)],
  };
}
