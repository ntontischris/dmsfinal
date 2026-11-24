import { createSupabase } from "@/lib/supabase/server";

import {
  parseBillablesTotal,
  parseReceiptAmounts,
  type ReceiptAmount,
} from "./finance-facts";
import { read, type ReadResult } from "./read";

// Τ8: οι αριθμοί χρημάτων της Σήμερα βγαίνουν από τα ίδια RPC με τις κάρτες των Τιμολογίων (billables_view, receipts_view),
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

// Όλες οι Εισπράξεις (με ΦΠΑ), όπως τις διαβάζει η κάρτα Εισπράξεις. null = δεν τις δικαιούται.
export async function getReceiptAmounts(): Promise<
  ReadResult<ReceiptAmount[] | null>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getReceiptAmounts",
    supabase.rpc("receipts_view", { p_client: null }),
    parseReceiptAmounts,
  );
}
