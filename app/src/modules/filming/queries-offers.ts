import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";

// Οι ώρες που προτείνει η ομάδα αντί για το ζητημένο (οδηγός «Εγκρίνω αιτήματα γυρίσματος», βήμα 2β).
// Όλα περνούν από RPC· η βάση ελέγχει Δικαίωμα και ότι κάθε ώρα είναι ακόμα ελεύθερη.

export interface OfferCandidates {
  times: string[];
  hours: number;
}

export interface FilmingOffer {
  // Όσες από τις ώρες είναι ακόμα ελεύθερες.
  times: string[];
  // Πόσες στάλθηκαν.
  offered: number;
  hours: number;
  note: string | null;
  offeredAt: string;
}

const candidatesSchema: z.ZodType<OfferCandidates> = z.object({
  times: z.array(z.string()),
  hours: z.number(),
});

const offerSchema: z.ZodType<FilmingOffer> = z.object({
  times: z.array(z.string()),
  offered: z.number(),
  hours: z.number(),
  note: z.string().nullable(),
  offeredAt: z.string(),
});

// Πόσες ώρες προτείνει έτοιμες ο οδηγός.
export const OFFER_COUNT = 3;

export async function getOfferCandidates(id: string): Promise<ReadResult<OfferCandidates>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getOfferCandidates",
    supabase.rpc("filming_offer_candidates", { p_id: id, p_count: OFFER_COUNT }),
    (data) => candidatesSchema.parse(data),
  );
}

// null = δεν υπάρχει πρόταση που ισχύει (ή ο Χρήστης δεν τη βλέπει).
export async function getOffer(id: string): Promise<ReadResult<FilmingOffer | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getOffer",
    supabase.rpc("filming_offer_view", { p_id: id }),
    (data) => offerSchema.nullable().parse(data),
  );
}
