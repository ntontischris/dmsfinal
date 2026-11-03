import { createSupabase } from "@/lib/supabase/server";

import {
  clientAgreementSchema,
  clientAgreementsSchema,
  type ClientAgreement,
  type ClientAgreementCard,
} from "./client-view-schema";
import { read, type ReadResult } from "./read";

// Οι αναγνώσεις του Χρήστη πελάτη. Η βάση κρίνει Δικαίωμα (c.agreements) και Πελάτη· δείχνει μόνο τις δικές του.

export async function listClientAgreements(): Promise<
  ReadResult<ClientAgreementCard[]>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listClientAgreements",
    supabase.rpc("client_agreements_view"),
    (data) => clientAgreementsSchema.parse(data),
  );
}

// Άγνωστη, ξένη ή εσωτερική Συμφωνία: null (η βάση δεν τις ξεχωρίζει).
export async function getClientAgreement(
  agreementId: string,
): Promise<ReadResult<ClientAgreement | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getClientAgreement",
    supabase.rpc("client_agreement_view", { p_agreement: agreementId }),
    (data) => clientAgreementSchema.parse(data),
  );
}
