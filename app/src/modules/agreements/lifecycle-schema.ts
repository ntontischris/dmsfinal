import { z } from "zod";

import { dateField, text } from "./schemas-parts";

// Λύση, «Χωρίς συνέχιση», ανανέωση και υπογεγραμμένο αρχείο μιας Συμφωνίας (b8, b9, b12): η ανάγνωση της βάσης
// (agreement_lifecycle_view) και οι φόρμες. Τι επιτρέπεται το λέει το `can` της βάσης.

const DATE_MESSAGE = "Γράψε ημερομηνία.";
const REASON_MESSAGE = "Γράψε τον λόγο της Λύσης (έως 500 χαρακτήρες).";
const NOTE_MESSAGE = "Η σημείωση είναι έως 500 χαρακτήρες.";

export const SIGNED_FILE_MAX_BYTES = 4 * 1024 * 1024;
export const SIGNED_FILE_MESSAGE =
  "Ανέβασε το υπογεγραμμένο αρχείο ως PDF, JPG ή PNG (έως 4 MB).";

const byLine = z.object({ byName: z.string().nullable() });

const lifecycleSchema = z.object({
  state: z.string(),
  renewalLeadDays: z.number().int().nullable(),
  noticeDays: z.number().int().nullable(),
  noContinuation: byLine
    .extend({ at: z.string(), note: z.string().nullable() })
    .nullable(),
  dissolution: byLine
    .extend({ on: z.string(), reason: z.string().nullable() })
    .nullable(),
  renewals: z.array(
    z.object({
      opportunityId: z.uuid(),
      opportunityTitle: z.string(),
      outcome: z.string(),
      agreementId: z.uuid().nullable(),
      termEnd: z.string(),
      isAutomatic: z.boolean(),
    }),
  ),
  signedFile: z
    .object({
      name: z.string(),
      type: z.string(),
      size: z.number().int(),
      uploadedAt: z.string(),
    })
    .nullable(),
  can: z.object({
    dissolve: z.boolean(),
    cancelDissolution: z.boolean(),
    setContinuation: z.boolean(),
    renew: z.boolean(),
    attachFile: z.boolean(),
  }),
});

export type Lifecycle = z.infer<typeof lifecycleSchema>;

// null: η Συμφωνία δεν φαίνεται σε αυτόν τον Χρήστη.
export const parseLifecycle = (data: unknown): Lifecycle | null =>
  data === null ? null : lifecycleSchema.parse(data);

const agreementId = z.uuid();

export const dissolveSchema = z.object({
  agreementId,
  on: dateField(DATE_MESSAGE),
  reason: text.min(1, REASON_MESSAGE).max(500, REASON_MESSAGE),
});

export const continuationSchema = z.object({
  agreementId,
  continue: z.enum(["yes", "no"]).transform((value) => value === "yes"),
  note: text.max(500, NOTE_MESSAGE),
});

// ───────────── Υπογεγραμμένο αρχείο ─────────────

const EXTENSIONS: Readonly<Record<string, "pdf" | "jpg" | "png">> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

// Τα πρώτα bytes κάθε τύπου: PDF «%PDF-», JPEG FF D8 FF, PNG 89 50 4E 47.
const SIGNATURES: Readonly<Record<string, readonly number[]>> = {
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d],
  jpg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
};

export const signedFileExtension = (type: string): string | null =>
  EXTENSIONS[type] ?? null;

export const isSignedFileOk = (file: unknown): file is File =>
  file instanceof File &&
  file.size > 0 &&
  file.size <= SIGNED_FILE_MAX_BYTES &&
  signedFileExtension(file.type) !== null;

export const hasFileSignature = (bytes: Uint8Array, ext: string): boolean => {
  const signature = SIGNATURES[ext];
  if (!signature || bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
};
