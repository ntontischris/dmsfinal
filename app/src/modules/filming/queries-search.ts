import { hrefOf } from "@/spaces/data/screens";
import { pickMatches, type RecordHit } from "@/spaces/data/search-records-model";

import { formatDate } from "./helpers-time";
import { listFilmings } from "./queries";
import type { ReadResult } from "./read";

// Αναζήτηση Γυρισμάτων (Ctrl+K): ο πίνακας είναι κλειστός, άρα η καρτέλα «Όλα» της E1 (η βάση αποφασίζει τι βλέπεις).
// Το Γύρισμα δεν έχει τίτλο: βρίσκεται από την Παραγωγή ή τον Πελάτη του.
export async function searchFilmings(term: string, limit: number): Promise<ReadResult<RecordHit[]>> {
  const found = await listFilmings("all");
  if (!found.ok) return found;
  return {
    ok: true,
    data: pickMatches(found.data, {
      term,
      limit,
      textOf: (row) => `${row.production.title} ${row.client?.name ?? ""}`,
    }).map((row) => ({
      id: row.id,
      label: `${row.production.title} · ${formatDate(row.startsAt)}`,
      sublabel: row.client?.name ?? null,
      href: hrefOf("E3", { id: row.id }),
    })),
  };
}
