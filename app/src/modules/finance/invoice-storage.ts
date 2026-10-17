import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { INVOICE_BUCKET } from "@/lib/email/deliver-invoice";
import { createAdminClient } from "@/lib/supabase/admin";

import { PDF_MAX_BYTES } from "./invoices-schemas";

// Το ιδιωτικό bucket των PDF Τιμολογίων. Καμία policy στο storage.objects: πρόσβαση μόνο με service role, από τον server.
// Το ανέβασμα γίνεται με το service role, αφού η βάση έδωσε τη θέση (invoice_upload_slot) και έλεγξε το Δικαίωμα.

const SIGNED_URL_SECONDS = 60;
const UNAVAILABLE_TEXT =
  "Η αποθήκευση αρχείων δεν είναι διαθέσιμη. Δοκίμασε ξανά σε λίγο.";
const UPLOAD_FAILED_TEXT = "Το PDF δεν αποθηκεύτηκε. Δοκίμασε ξανά.";

export type StorageOutcome = { ok: true } | { ok: false; error: string };

const isBucketMissing = (message: string): boolean =>
  /bucket not found/i.test(message);

// Το migration φτιάχνει το bucket όπου υπάρχει storage· όπου δεν υπήρχε ακόμα (τοπικό περιβάλλον), φτιάχνεται εδώ.
async function ensureBucket(admin: SupabaseClient): Promise<void> {
  const { error } = await admin.storage.createBucket(INVOICE_BUCKET, {
    public: false,
    fileSizeLimit: PDF_MAX_BYTES,
    allowedMimeTypes: ["application/pdf"],
  });
  if (error && !/already exists/i.test(error.message))
    console.error("invoiceBucket", error.message);
}

async function putFile(admin: SupabaseClient, path: string, body: Buffer) {
  return admin.storage
    .from(INVOICE_BUCKET)
    .upload(path, body, { contentType: "application/pdf", upsert: false });
}

export async function uploadInvoicePdf(
  path: string,
  bytes: Buffer,
): Promise<StorageOutcome> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: UNAVAILABLE_TEXT };
  let { error } = await putFile(admin, path, bytes);
  if (error && isBucketMissing(error.message)) {
    await ensureBucket(admin);
    ({ error } = await putFile(admin, path, bytes));
  }
  if (error) {
    console.error("uploadInvoicePdf", error.message);
    return { ok: false, error: UPLOAD_FAILED_TEXT };
  }
  return { ok: true };
}

// Αν η καταχώριση αποτύχει μετά το ανέβασμα, το αρχείο δεν μένει ορφανό.
export async function removeInvoicePdf(path: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin.storage.from(INVOICE_BUCKET).remove([path]);
  if (error) console.error("removeInvoicePdf", error.message);
}

export async function signedInvoicePdfUrl(
  path: string,
): Promise<string | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.storage
    .from(INVOICE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data) return null;
  return data.signedUrl;
}

// Πολλά signed URLs μαζί (Πακέτο λογιστή, Ρδ #201): μόνο για διαδρομές που έδωσε ήδη η βάση σε αυτόν τον Χρήστη
// (export_accountant_pack, με τον ίδιο έλεγχο με την invoice_pdf_path). Διαδρομή χωρίς αρχείο → λείπει από το αποτέλεσμα.
export async function signedInvoicePdfUrls(
  paths: readonly string[],
  seconds: number,
): Promise<ReadonlyMap<string, string>> {
  if (paths.length === 0) return new Map();
  const admin = createAdminClient();
  if (!admin) return new Map();
  const { data, error } = await admin.storage
    .from(INVOICE_BUCKET)
    .createSignedUrls([...paths], seconds);
  if (error || !data) {
    if (error) console.error("signedInvoicePdfUrls", error.message);
    return new Map();
  }
  return new Map(
    data.flatMap((item) =>
      item.path && item.signedUrl && !item.error ? [[item.path, item.signedUrl] as const] : [],
    ),
  );
}
