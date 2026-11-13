import "server-only";

import { createSupabase } from "@/lib/supabase/server";

import { signedFileUrl } from "./agreement-files";
import { parseLifecycle, type Lifecycle } from "./lifecycle-schema";
import { read, type ReadResult } from "./read";

// Η ανάγνωση της Λύσης, της συνέχισης, των ανανεώσεων και του υπογεγραμμένου αρχείου για τη D2.
export async function getLifecycle(
  agreementId: string,
): Promise<ReadResult<Lifecycle | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getLifecycle",
    supabase.rpc("agreement_lifecycle_view", { p_agreement: agreementId }),
    parseLifecycle,
  );
}

export type SignedFileLink =
  { ok: true; url: string } | { ok: false; status: 404 | 500 };

// Η βάση ελέγχει ότι ο Χρήστης βλέπει τη Συμφωνία· κάθε άρνηση φαίνεται προς τα έξω ως «δεν βρέθηκε».
export async function getSignedFileLink(
  agreementId: string,
): Promise<SignedFileLink> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false, status: 500 };
  const { data, error } = await supabase.rpc("agreement_signed_file_path", {
    p_agreement: agreementId,
  });
  if (error) {
    if (error.code === "42501" || error.code === "P0001")
      return { ok: false, status: 404 };
    console.error("getSignedFileLink", error.message);
    return { ok: false, status: 500 };
  }
  if (typeof data !== "string") return { ok: false, status: 404 };
  const url = await signedFileUrl(data);
  return url ? { ok: true, url } : { ok: false, status: 404 };
}
