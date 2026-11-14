import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

// Το ιδιωτικό bucket των υπογεγραμμένων αρχείων Συμφωνιών. Καμία policy στο storage.objects: πρόσβαση μόνο με service
// role, από τον server, αφού η βάση έδωσε τη θέση (agreement_signed_file_slot) και έλεγξε το Δικαίωμα.

const BUCKET = "agreement-files";
const BUCKET_LIMIT = 10 * 1024 * 1024; // ίδιο με το migration· το ανέβασμα από την εφαρμογή σταματά στα 4 MB
const SIGNED_URL_SECONDS = 60;
const UNAVAILABLE_TEXT =
  "Η αποθήκευση αρχείων δεν είναι διαθέσιμη. Δοκίμασε ξανά σε λίγο.";
const UPLOAD_FAILED_TEXT = "Το αρχείο δεν αποθηκεύτηκε. Δοκίμασε ξανά.";

export type StorageOutcome = { ok: true } | { ok: false; error: string };

const isBucketMissing = (message: string): boolean =>
  /bucket not found/i.test(message);

// Το migration φτιάχνει το bucket όπου υπάρχει storage· όπου δεν υπήρχε ακόμα, φτιάχνεται εδώ.
async function ensureBucket(admin: SupabaseClient): Promise<void> {
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: BUCKET_LIMIT,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  });
  if (error && !/already exists/i.test(error.message))
    console.error("agreementBucket", error.message);
}

interface StoredFile {
  path: string;
  bytes: Buffer;
  type: string;
}

async function putFile(admin: SupabaseClient, file: StoredFile) {
  return admin.storage
    .from(BUCKET)
    .upload(file.path, file.bytes, { contentType: file.type, upsert: false });
}

export async function uploadSignedFile(
  file: StoredFile,
): Promise<StorageOutcome> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: UNAVAILABLE_TEXT };
  let { error } = await putFile(admin, file);
  if (error && isBucketMissing(error.message)) {
    await ensureBucket(admin);
    ({ error } = await putFile(admin, file));
  }
  if (error) {
    console.error("uploadSignedFile", error.message);
    return { ok: false, error: UPLOAD_FAILED_TEXT };
  }
  return { ok: true };
}

// Για αρχείο που η βάση απέρριψε μετά το ανέβασμα, ή για το παλιό αρχείο μετά από αντικατάσταση.
export async function removeSignedFile(path: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin.storage.from(BUCKET).remove([path]);
  if (error) console.error("removeSignedFile", error.message);
}

export async function signedFileUrl(path: string): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}
