"use server";

import { after } from "next/server";

import { kickOutbox } from "@/lib/email/outbox-trigger";
import { rpcMessage } from "@/lib/rpc-error";
import { createSupabase } from "@/lib/supabase/server";

import { UNCONFIGURED } from "./provision";
import type { FormState } from "./schemas";

// Ρυθμίσεις › Ενσωματώσεις (O8): δοκιμαστικό email στον Ιδιοκτήτη. Η βάση δέχεται μόνο αυτό το είδος και μόνο σε εμένα.
export async function sendTestEmail(): Promise<FormState> {
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email;
  if (!email) return { error: "Δεν βρέθηκε το email του λογαριασμού σου." };
  const { error } = await supabase.rpc("email_outbox_enqueue", {
    p_kind: "test",
    p_to_name: "",
    p_to_email: email,
    p_locale: "el",
    p_payload: {},
  });
  if (error) return { error: rpcMessage(error, "Το δοκιμαστικό email δεν μπήκε στην ουρά.") };
  after(() => kickOutbox());
  return { notice: "Το δοκιμαστικό μπήκε στην ουρά. Θα φανεί στο Ιστορικό σε λίγο." };
}
