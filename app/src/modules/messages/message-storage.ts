import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { MESSAGE_ATTACHMENT_BUCKET } from "@/lib/messages/attachment-bucket";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  ATTACHMENT_EXTENSIONS,
  ATTACHMENT_MAX_BYTES,
} from "./attachment-rules";

// Το ιδιωτικό bucket των συνημμένων. Καμία policy στο storage.objects: πρόσβαση μόνο με service role, από τον server.
// Το αρχείο ανεβαίνει απευθείας από τον browser με signed upload URL (το Vercel κόβει σώματα πάνω από 4,5 MB).

const SIGNED_URL_SECONDS = 60;

export interface UploadTarget {
  path: string;
  token: string;
}

export type StorageResult<T> = { ok: true; value: T } | { ok: false };

const isBucketMissing = (message: string): boolean =>
  /bucket not found/i.test(message);

// Το migration φτιάχνει το bucket όπου υπάρχει storage· όπου δεν υπήρχε ακόμα (τοπικό περιβάλλον), φτιάχνεται εδώ.
export async function ensureBucket(admin: SupabaseClient): Promise<void> {
  const { error } = await admin.storage.createBucket(
    MESSAGE_ATTACHMENT_BUCKET,
    {
      public: false,
      fileSizeLimit: ATTACHMENT_MAX_BYTES,
      allowedMimeTypes: Object.keys(ATTACHMENT_EXTENSIONS),
    },
  );
  if (error && !/already exists/i.test(error.message))
    console.error("messageBucket", error.message);
}

const signOne = (admin: SupabaseClient, path: string) =>
  admin.storage.from(MESSAGE_ATTACHMENT_BUCKET).createSignedUploadUrl(path);

async function signWithBucket(admin: SupabaseClient, path: string) {
  const first = await signOne(admin, path);
  if (!first.error || !isBucketMissing(first.error.message)) return first;
  await ensureBucket(admin);
  return signOne(admin, path);
}

// Μία άδεια ανεβάσματος ανά διαδρομή (δίνεται από τη βάση, μετά τον έλεγχο Δικαιώματος).
export async function createUploadUrls(
  paths: readonly string[],
): Promise<StorageResult<UploadTarget[]>> {
  const admin = createAdminClient();
  if (!admin) return { ok: false };
  const targets: UploadTarget[] = [];
  for (const path of paths) {
    const { data, error } = await signWithBucket(admin, path);
    if (error || !data) {
      console.error("createUploadUrls", error?.message);
      return { ok: false };
    }
    targets.push({ path, token: data.token });
  }
  return { ok: true, value: targets };
}

export async function signedDownloadUrl(path: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.storage
    .from(MESSAGE_ATTACHMENT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

// Μετά από επιτυχή διαγραφή Μηνύματος. Αποτυχία καταγράφεται μόνο: το Μήνυμα έχει ήδη διαγραφεί και δεν δείχνει πια τα αρχεία.
export async function removeFiles(paths: readonly string[]): Promise<void> {
  if (paths.length === 0) return;
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin.storage
    .from(MESSAGE_ATTACHMENT_BUCKET)
    .remove([...paths]);
  if (error) console.error("removeFiles", error.message);
}
