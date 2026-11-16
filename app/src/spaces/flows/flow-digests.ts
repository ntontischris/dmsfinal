"use server";

import { createSupabase } from "@/lib/supabase/server";
import { loadEgkrinoRows } from "@/modules/filming";
import { getDeletionRequests } from "@/modules/google";
import { readNeedsMe } from "@/modules/messages";

import {
  apantoDigest,
  egkrinoDigest,
  parseCardRead,
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
  const [needs, approvals, egkrino] = await Promise.all([
    readNeedsMe(),
    card("filming_approvals"),
    getDeletionRequests()
      .then(loadEgkrinoRows)
      .catch((error: unknown) => {
        console.error("flows.egkrino:", error);
        return null;
      }),
  ]);
  return {
    at,
    jobs: [
      apantoDigest(needs),
      egkrinoDigest(approvals, egkrino?.count ?? null),
    ],
  };
}
