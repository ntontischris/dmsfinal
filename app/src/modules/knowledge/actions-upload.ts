"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { kickKnowledgeIndex } from "@/lib/knowledge-index/kick";
import { supabaseConfig } from "@/lib/supabase/config";

import { callRpc, UNCONFIGURED_TEXT } from "./action-support";
import { createUploadToken, removeFiles } from "./knowledge-storage";
import {
  attachSchema,
  previousSchema,
  slotSchema,
  uploadRequestSchema,
} from "./schemas";

// Ανέβασμα στη Γνώση: η βάση ελέγχει Δικαίωμα και κανόνες και δίνει τη διαδρομή (knowledge_upload_slot), ο server φτιάχνει
// signed upload URL, και το αρχείο ανεβαίνει απευθείας από τον browser (όχι μέσα από server action: όριο Vercel 4,5 MB).

const UPLOAD_UNAVAILABLE_TEXT =
  "Η αποθήκευση αρχείων δεν είναι διαθέσιμη. Δοκίμασε ξανά σε λίγο.";

export interface UploadTicket {
  path: string;
  token: string;
  url: string;
  key: string;
}

export type UploadTicketResult =
  { ok: true; ticket: UploadTicket } | { ok: false; error: string };

export async function requestUpload(
  input: unknown,
): Promise<UploadTicketResult> {
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Άκυρο αρχείο.",
    };
  const connection = supabaseConfig();
  if (!connection) return { ok: false, error: UNCONFIGURED_TEXT };
  const { itemId, purpose, mime, size } = parsed.data;
  const outcome = await callRpc("knowledge_upload_slot", {
    p_item: itemId,
    p_purpose: purpose,
    p_mime: mime,
    p_size: size,
  });
  if (!outcome.ok)
    return { ok: false, error: outcome.state.error ?? UPLOAD_UNAVAILABLE_TEXT };
  const slot = slotSchema.safeParse(outcome.data);
  if (!slot.success) return { ok: false, error: UPLOAD_UNAVAILABLE_TEXT };
  const token = await createUploadToken(slot.data.path);
  if (!token.ok) return { ok: false, error: UPLOAD_UNAVAILABLE_TEXT };
  return {
    ok: true,
    ticket: {
      path: slot.data.path,
      token: token.value,
      url: connection.url,
      key: connection.key,
    },
  };
}

export type AttachResult = { ok: true } | { ok: false; error: string };

// Το Αρχείο ανέβηκε: γράφεται στο στοιχείο, και το προηγούμενο (αν υπήρχε) σβήνεται από το Storage.
export async function attachFile(input: unknown): Promise<AttachResult> {
  const parsed = attachSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Άκυρο αρχείο.",
    };
  const outcome = await callRpc("knowledge_item_attach_file", {
    p_item: parsed.data.itemId,
    p_path: parsed.data.path,
    p_name: parsed.data.name,
  });
  if (!outcome.ok)
    return { ok: false, error: outcome.state.error ?? UPLOAD_UNAVAILABLE_TEXT };
  const previous = previousSchema.safeParse(outcome.data);
  if (previous.success && previous.data.previousPath)
    await removeFiles([previous.data.previousPath]);
  after(() => kickKnowledgeIndex(parsed.data.itemId));
  revalidatePath("/app", "layout");
  return { ok: true };
}
