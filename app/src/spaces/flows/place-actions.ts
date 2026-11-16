"use server";

import { revalidatePath } from "next/cache";
import { createSupabase } from "@/lib/supabase/server";

import { JOB, placeSchema } from "./place-schema";
import type { QueueRead } from "./xekino-rows";

// Οι θέσεις των μισών οδηγών στον λογαριασμό (today_flow_places). Η βάση αποφασίζει ποιος μπορεί· εδώ μόνο η είσοδος.

export interface PlaceResult {
  error: string | null;
}

const NOT_SAVED = "Η θέση του οδηγού δεν αποθηκεύτηκε στον λογαριασμό.";

export async function savePlace(input: unknown): Promise<PlaceResult> {
  const parsed = placeSchema.safeParse(input);
  if (!parsed.success) return { error: "Άγνωστη θέση." };
  const supabase = await createSupabase();
  if (!supabase) return { error: NOT_SAVED };
  const { job, ...place } = parsed.data;
  const { error } = await supabase.rpc("today_place_set", {
    p_job: job,
    p_place: place,
  });
  if (error) {
    console.error("flows.place.set:", error.message);
    return { error: NOT_SAVED };
  }
  revalidatePath("/app");
  return { error: null };
}

export async function clearPlace(input: unknown): Promise<PlaceResult> {
  const parsed = JOB.safeParse(input);
  if (!parsed.success) return { error: "Άγνωστος οδηγός." };
  const supabase = await createSupabase();
  if (!supabase) return { error: NOT_SAVED };
  const { error } = await supabase.rpc("today_place_clear", {
    p_job: parsed.data,
  });
  if (error) {
    console.error("flows.place.clear:", error.message);
    return { error: NOT_SAVED };
  }
  revalidatePath("/app");
  return { error: null };
}

// «Επόμενο ✓» του βήματος 2: τα κλειδιά των γραμμών της λίστας τώρα και οι κάρτες που δεν φόρτωσαν (γι' αυτές
// δεν κρίνεται τίποτα). null = δεν διαβάστηκαν.
export async function readQueueKeys(): Promise<QueueRead | null> {
  const { loadTodayRows } = await import("./today-load");
  const rows = await loadTodayRows(Date.now());
  return rows.failed.length > 0 && rows.cards.length === 0
    ? null
    : {
        keys: rows.cards.map((row) => row.key),
        failed: rows.failed.map((card) => card.id),
      };
}
