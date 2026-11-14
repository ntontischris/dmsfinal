import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

import { LOGO_MAX_BYTES } from "./logo-file";

// Το ιδιωτικό bucket του λογότυπου (e1). Καμία policy στο storage.objects: γράφει ο server με service role αφού η
// βάση έδωσε θέση (company_logo_slot) και έλεγξε το Δικαίωμα· διαβάζει το route /company-logo για κέλυφος και email.

const BUCKET = "company-logo";
const UNAVAILABLE_TEXT =
  "Η αποθήκευση αρχείων δεν είναι διαθέσιμη. Δοκίμασε ξανά σε λίγο.";
const UPLOAD_FAILED_TEXT = "Το λογότυπο δεν αποθηκεύτηκε. Δοκίμασε ξανά.";

export type LogoStorageOutcome = { ok: true } | { ok: false; error: string };

export interface LogoFile {
  bytes: Uint8Array;
  type: string;
}

const isBucketMissing = (message: string): boolean =>
  /bucket not found/i.test(message);

// Το migration φτιάχνει το bucket όπου υπάρχει storage· όπου δεν υπήρχε ακόμα, φτιάχνεται εδώ.
async function ensureBucket(admin: SupabaseClient): Promise<void> {
  const { error } = await admin.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: LOGO_MAX_BYTES,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  });
  if (error && !/already exists/i.test(error.message))
    console.error("logoBucket", error.message);
}

async function putLogo(admin: SupabaseClient, path: string, file: LogoFile) {
  return admin.storage
    .from(BUCKET)
    .upload(path, file.bytes, { contentType: file.type, upsert: false });
}

export async function uploadLogoFile(
  path: string,
  file: LogoFile,
): Promise<LogoStorageOutcome> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: UNAVAILABLE_TEXT };
  let { error } = await putLogo(admin, path, file);
  if (error && isBucketMissing(error.message)) {
    await ensureBucket(admin);
    ({ error } = await putLogo(admin, path, file));
  }
  if (error) {
    console.error("uploadLogoFile", error.message);
    return { ok: false, error: UPLOAD_FAILED_TEXT };
  }
  return { ok: true };
}

// Για αρχείο που η βάση απέρριψε μετά το ανέβασμα, ή για το παλιό μετά από αντικατάσταση ή αφαίρεση.
export async function removeLogoFile(path: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin.storage.from(BUCKET).remove([path]);
  if (error) console.error("removeLogoFile", error.message);
}

// Το τρέχον λογότυπο για το route /company-logo· null όταν δεν υπάρχει (τότε δείχνεται το προεπιλεγμένο).
export async function readLogoFile(): Promise<LogoFile | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data: row, error } = await admin
    .from("company_settings")
    .select("logo_path, logo_type")
    .eq("id", true)
    .maybeSingle();
  if (error) console.error("readLogoFile", error.message);
  if (!row?.logo_path || !row.logo_type) return null;
  const { data: blob, error: downloadError } = await admin.storage
    .from(BUCKET)
    .download(row.logo_path);
  if (downloadError || !blob) {
    console.error("readLogoFile", downloadError?.message ?? "empty");
    return null;
  }
  return { bytes: new Uint8Array(await blob.arrayBuffer()), type: row.logo_type };
}
