"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { kickOutbox } from "@/lib/email/outbox-trigger";
import type { FormState } from "@/lib/form-state";
import { rpcMessage } from "@/lib/rpc-error";
import { createSupabase } from "@/lib/supabase/server";

import { EVENTS, HEALTH_PATH, SENDS } from "./labels";
import { ignoreSchema, resendSchema, retryEventSchema } from "./schemas";

// Οι τρεις ενέργειες της P2 (#215, Υ7). Το Δικαίωμα, το «μία φορά» και το Ίχνος τα κρατά η βάση· εδώ μόνο το μήνυμα.

const UNCONFIGURED: FormState = { error: "Η βάση δεν έχει συνδεθεί ακόμα." };

async function run(
  rpc: string,
  args: Record<string, unknown>,
  fallback: string,
): Promise<FormState | null> {
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase.rpc(rpc, args);
  return error ? { error: rpcMessage(error, fallback) } : null;
}

// Η ουρά τρέχει αμέσως (σκούντημα), ώστε η αποστολή ή το Γεγονός να μη περιμένει το επόμενο λεπτό.
function done(notice: string, isKick: boolean): FormState {
  if (isKick) after(() => kickOutbox());
  revalidatePath(HEALTH_PATH);
  return { notice };
}

export async function resendFailedSend(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = resendSchema.safeParse({ ref: form.get("ref") });
  if (!parsed.success) return { error: "Η αποστολή δεν βρέθηκε." };
  const failed = await run(
    "send_retry",
    { p_ref: parsed.data.ref },
    "Δεν ξαναστάλθηκε. Δοκίμασε ξανά.",
  );
  return failed ?? done(SENDS.resent, true);
}

export async function ignoreFailedSend(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = ignoreSchema.safeParse({ ref: form.get("ref") });
  if (!parsed.success) return { error: "Η αποστολή δεν βρέθηκε." };
  const failed = await run(
    "send_ignore",
    { p_ref: parsed.data.ref },
    "Δεν αγνοήθηκε. Δοκίμασε ξανά.",
  );
  return failed ?? done(SENDS.ignored, false);
}

export async function retryStuckEvent(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = retryEventSchema.safeParse({ id: form.get("id") });
  if (!parsed.success) return { error: "Το Γεγονός δεν βρέθηκε." };
  const failed = await run(
    "event_retry",
    { p_event: parsed.data.id },
    "Δεν ξαναδοκιμάστηκε. Δοκίμασε ξανά.",
  );
  return failed ?? done(EVENTS.retried, true);
}
