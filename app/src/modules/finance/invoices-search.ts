import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import type { RecordHit } from "@/spaces/data/search-records-model";
import { fmtDate } from "@/spaces/screens/shared";

import { financeViewOf } from "./caps";
import { getInvoices } from "./invoices-queries";
import { getClientInvoices } from "./ledger-queries";
import type { ReadResult } from "./read";

// Αναζήτηση Τιμολογίων με τον αριθμό (Ctrl+K): ο πίνακας είναι κλειστός, άρα οι ίδιες λίστες με την I2 (ομάδα ή πελάτης).
// Δεν υπάρχει σελίδα Τιμολογίου: η ομάδα ανοίγει την I2 φιλτραρισμένη στον Πελάτη του, ο πελάτης την I2 του.

interface NumberedRow {
  id: string;
  number: string;
  issueDate: string;
}

export const matchesNumber = (number: string, term: string): boolean =>
  number.toLocaleLowerCase("el").includes(term.trim().toLocaleLowerCase("el"));

const pick = <T extends NumberedRow>(rows: readonly T[], term: string, limit: number): T[] =>
  rows.filter((row) => matchesNumber(row.number, term)).slice(0, limit);

export async function searchInvoices(term: string, limit: number): Promise<ReadResult<RecordHit[]>> {
  const view = financeViewOf(await getViewer());
  if (view === "none") return { ok: true, data: [] };
  if (view === "client") {
    const found = await getClientInvoices();
    if (!found.ok) return found;
    return {
      ok: true,
      data: pick(found.data.items, term, limit).map((row) => ({
        id: row.id,
        label: row.number,
        sublabel: fmtDate(row.issueDate),
        href: hrefOf("I2"),
      })),
    };
  }
  const found = await getInvoices("all");
  if (!found.ok) return found;
  return {
    ok: true,
    data: pick(found.data.items, term, limit).map((row) => ({
      id: row.id,
      label: row.number,
      sublabel: row.clientName,
      href: hrefOf("I2", { client: row.clientId }),
    })),
  };
}
