import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

import {
  FILE_MIMES,
  KNOWLEDGE_BUCKET,
  UPLOAD_MAX_BYTES,
  ARTICLE_IMAGE_MIMES,
} from "./upload-rules";

// Το ιδιωτικό bucket της Γνώσης. Καμία policy στο storage.objects: πρόσβαση μόνο με service role, από τον server, και μόνο
// για διαδρομές που έδωσε ή έλεγξε η βάση. Το αρχείο ανεβαίνει από τον browser με signed upload URL (όριο Vercel 4,5 MB).

const SIGNED_URL_SECONDS = 60;

export type StorageResult<T> = { ok: true; value: T } | { ok: false };

const isBucketMissing = (message: string): boolean =>
  /bucket not found/i.test(message);

// Το migration φτιάχνει το bucket όπου υπάρχει storage· όπου δεν υπήρχε ακόμα, φτιάχνεται εδώ.
async function ensureBucket(admin: SupabaseClient): Promise<void> {
  const { error } = await admin.storage.createBucket(KNOWLEDGE_BUCKET, {
    public: false,
    fileSizeLimit: UPLOAD_MAX_BYTES,
    allowedMimeTypes: [...new Set([...FILE_MIMES, ...ARTICLE_IMAGE_MIMES])],
  });
  if (error && !/already exists/i.test(error.message))
    console.error("knowledgeBucket", error.message);
}

const signOne = (admin: SupabaseClient, path: string) =>
  admin.storage.from(KNOWLEDGE_BUCKET).createSignedUploadUrl(path);

export async function createUploadToken(
  path: string,
): Promise<StorageResult<string>> {
  const admin = createAdminClient();
  if (!admin) return { ok: false };
  let result = await signOne(admin, path);
  if (result.error && isBucketMissing(result.error.message)) {
    await ensureBucket(admin);
    result = await signOne(admin, path);
  }
  if (result.error || !result.data) {
    console.error("createUploadToken", result.error?.message);
    return { ok: false };
  }
  return { ok: true, value: result.data.token };
}

// Σύνδεσμος 60″ για λήψη (με το όνομα του αρχείου) ή για προβολή εικόνας.
export async function signedUrl(
  path: string,
  downloadName?: string,
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.storage
    .from(KNOWLEDGE_BUCKET)
    .createSignedUrl(
      path,
      SIGNED_URL_SECONDS,
      downloadName ? { download: downloadName } : undefined,
    );
  if (error || !data) return null;
  return data.signedUrl;
}

// Μετά από επιτυχή διαγραφή ή αντικατάσταση. Αποτυχία καταγράφεται μόνο: η βάση δεν δείχνει πια τα αρχεία.
export async function removeFiles(paths: readonly string[]): Promise<void> {
  if (paths.length === 0) return;
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin.storage
    .from(KNOWLEDGE_BUCKET)
    .remove([...paths]);
  if (error) console.error("knowledge removeFiles", error.message);
}
