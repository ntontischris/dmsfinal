import { hrefOf } from "@/spaces/data/screens";
import { pickMatches, type RecordHit } from "@/spaces/data/search-records-model";

import { listAgreements } from "./queries-agreements";
import type { ReadResult } from "./read";

// Αναζήτηση Συμφωνιών (Ctrl+K): οι πίνακες είναι κλειστοί, άρα η ίδια λίστα με την D1 (η βάση αποφασίζει τι βλέπεις).
export async function searchAgreements(term: string, limit: number): Promise<ReadResult<RecordHit[]>> {
  const found = await listAgreements();
  if (!found.ok) return found;
  return {
    ok: true,
    data: pickMatches(found.data, {
      term,
      limit,
      textOf: (row) => `${row.title} ${row.clientName}`,
    }).map((row) => ({
      id: row.id,
      label: row.title,
      sublabel: row.clientName,
      href: hrefOf("D2", { id: row.id }),
    })),
  };
}
