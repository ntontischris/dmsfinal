import { createSupabase } from "@/lib/supabase/server";

import type { ReadResult } from "./read";
import { publicTokenSchema } from "./schemas";
import type { PublicProposal } from "./types";
import { publicViewSchema } from "./view-schema";

// Η δημόσια όψη του Συνδέσμου (D5). Ανώνυμη: μιλά μόνο στο agreement_public_view και δεν διαβάζει Χρήστη.
// Το token και τα σφάλματα δεν καταγράφονται ποτέ, ούτε στο console.error.

// Κακοσχηματισμένο token δεν φτάνει καν στη βάση: μοιάζει με άγνωστο, όπως ακριβώς θα απαντούσε και εκείνη.
export async function getPublicProposal(
  token: string,
): Promise<ReadResult<PublicProposal>> {
  if (!publicTokenSchema.safeParse(token).success)
    return { ok: true, data: { status: "unknown" } };
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("agreement_public_view", {
    p_token: token,
  });
  if (error) {
    console.error("agreements public view", error.code);
    return { ok: false };
  }
  const parsed = publicViewSchema.safeParse(data);
  if (!parsed.success) {
    console.error("agreements public view", "unreadable answer");
    return { ok: false };
  }
  return { ok: true, data: parsed.data };
}
