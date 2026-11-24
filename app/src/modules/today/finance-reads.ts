import { createSupabase } from "@/lib/supabase/server";

import {
  type MonthReceived,
  parseBillablesTotal,
  parseMonthReceived,
} from "./finance-facts";
import { read, type ReadResult } from "./read";

// Τ8: οι αριθμοί χρημάτων της Σήμερα βγαίνουν από τα ίδια RPC/κανόνες με τις κάρτες των Τιμολογίων (billables_view, today_received),
// ώστε να λένε τα ίδια. Διαβάζονται εδώ και όχι από το finance, που ήδη εισάγει τη Σήμερα (λωρίδα Χώρου).

// Το σύνολο «Προς τιμολόγηση» (καθαρά, όλοι οι Πελάτες), όπως η κάρτα των Τιμολογίων. null = δεν το δικαιούται.
export async function getToInvoiceTotal(): Promise<ReadResult<number | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getToInvoiceTotal",
    supabase.rpc("billables_view"),
    parseBillablesTotal,
  );
}

// «Μπήκαν τον <μήνα>»: ένα άθροισμα στη βάση (μόνο οι Εισπράξεις του μήνα), όχι όλες οι Εισπράξεις.
export async function getMonthReceived(): Promise<
  ReadResult<MonthReceived | null>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getMonthReceived",
    supabase.rpc("today_received"),
    parseMonthReceived,
  );
}
