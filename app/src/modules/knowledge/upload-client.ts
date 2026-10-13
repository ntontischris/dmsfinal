"use client";

import { createClient } from "@supabase/supabase-js";

import { requestUpload } from "./actions-upload";
import {
  KNOWLEDGE_BUCKET,
  uploadError,
  type UploadPurpose,
} from "./upload-rules";

// Ανέβασμα από τον browser: ο server δίνει διαδρομή και signed upload URL, το αρχείο πάει απευθείας στο Storage.

export type UploadOutcome =
  { ok: true; path: string } | { ok: false; error: string };

const UPLOAD_FAILED_TEXT = "Το αρχείο δεν ανέβηκε. Δοκίμασε ξανά.";

export async function uploadToKnowledge(
  itemId: string,
  purpose: UploadPurpose,
  file: File,
): Promise<UploadOutcome> {
  const problem = uploadError(purpose, file);
  if (problem !== null) return { ok: false, error: problem };
  const request = await requestUpload({
    itemId,
    purpose,
    mime: file.type,
    size: file.size,
  });
  if (!request.ok) return request;
  const { ticket } = request;
  const client = createClient(ticket.url, ticket.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { error } = await client.storage
    .from(KNOWLEDGE_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: file.type,
    });
  return error
    ? { ok: false, error: UPLOAD_FAILED_TEXT }
    : { ok: true, path: ticket.path };
}
