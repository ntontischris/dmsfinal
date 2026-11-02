import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";
import { hrefOf } from "@/spaces/data/screens";
import { ilikePattern, type RecordHit } from "@/spaces/data/search-records-model";

import { read, type ReadResult } from "./read";

// Αναζήτηση Πελατών (Ctrl+K): ο πίνακας με τη RLS, άρα μόνο όσοι αφορούν τον Χρήστη· οι συγχωνευμένοι λείπουν.
const rowsSchema = z.array(z.object({ id: z.string(), name: z.string(), city: z.string() }));

export async function searchClients(term: string, limit: number): Promise<ReadResult<RecordHit[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "searchClients",
    supabase
      .from("clients")
      .select("id, name, city")
      .ilike("name", ilikePattern(term))
      .is("merged_into_id", null)
      .order("name")
      .limit(limit),
    (data) =>
      rowsSchema.parse(data).map((row) => ({
        id: row.id,
        label: row.name,
        sublabel: row.city || null,
        href: hrefOf("B2", { id: row.id }),
      })),
  );
}
