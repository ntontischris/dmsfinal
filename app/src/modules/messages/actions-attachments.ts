"use server";

import { messageOf, UNCONFIGURED_TEXT } from "./action-support";
import { createUploadUrls } from "./message-storage";
import { slotsSchema, uploadRequestSchema } from "./schemas";
import { createSupabase } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";

// Συνημμένα (Μ7): η βάση ελέγχει Δικαίωμα και κανόνες αρχείων και δίνει θέσεις (message_attachment_slots), ο server φτιάχνει
// signed upload URLs, και το αρχείο ανεβαίνει απευθείας από τον browser (όχι μέσα από server action: το Vercel κόβει στα 4,5 MB).

const UPLOAD_UNAVAILABLE_TEXT =
  "Η αποθήκευση αρχείων δεν είναι διαθέσιμη. Δοκίμασε ξανά σε λίγο.";

export interface UploadSlot {
  path: string;
  name: string;
  token: string;
}

export interface UploadConnection {
  url: string;
  key: string;
}

export type UploadRequestResult =
  | { ok: true; slots: UploadSlot[]; connection: UploadConnection }
  | { ok: false; error: string };

const failure = (error: string): UploadRequestResult => ({ ok: false, error });

export async function requestAttachmentUploads(
  input: unknown,
): Promise<UploadRequestResult> {
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success)
    return failure(parsed.error.issues[0]?.message ?? "Άκυρα αρχεία.");
  const supabase = await createSupabase();
  const connection = supabaseConfig();
  if (!supabase || !connection) return failure(UNCONFIGURED_TEXT);
  const { clientId, productionId, files } = parsed.data;
  const { data, error } = await supabase.rpc("message_attachment_slots", {
    p_client: clientId,
    p_files: files,
    p_production: productionId,
  });
  if (error) return failure(messageOf(error));
  const slots = slotsSchema.parse(data).slots;
  const urls = await createUploadUrls(slots.map((slot) => slot.path));
  if (!urls.ok) return failure(UPLOAD_UNAVAILABLE_TEXT);
  const tokens = new Map(
    urls.value.map((target) => [target.path, target.token]),
  );
  return {
    ok: true,
    connection: { url: connection.url, key: connection.key },
    slots: slots.map((slot) => ({
      ...slot,
      token: tokens.get(slot.path) ?? "",
    })),
  };
}
