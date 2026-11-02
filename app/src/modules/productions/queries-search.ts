import { hrefOf } from "@/spaces/data/screens";
import { pickMatches, type RecordHit } from "@/spaces/data/search-records-model";

import { listProductions } from "./queries";
import type { ReadResult } from "./read";

// Αναζήτηση Παραγωγών (Ctrl+K): ο πίνακας είναι κλειστός, άρα η ίδια λίστα με την G1 (η βάση αποφασίζει τι βλέπεις).
export async function searchProductions(term: string, limit: number): Promise<ReadResult<RecordHit[]>> {
  const found = await listProductions({ state: null, internalOnly: false });
  if (!found.ok) return found;
  return {
    ok: true,
    data: pickMatches(found.data, {
      term,
      limit,
      textOf: (row) => `${row.title} ${row.client?.name ?? ""}`,
    }).map((row) => ({
      id: row.id,
      label: row.title,
      sublabel: row.client?.name ?? "Εσωτερική",
      href: hrefOf("G2", { id: row.id }),
    })),
  };
}
