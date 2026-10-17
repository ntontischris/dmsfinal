import { z } from "zod";

// Τα σχήματα των Αιτημάτων GDPR: ό,τι στέλνει η φόρμα και ό,τι επιστρέφει η βάση (gdpr_register, gdpr_subjects,
// gdpr_export). Τους κανόνες (Ιδιοκτήτης, προθεσμία, «δεν γίνεται») τους έχει η βάση· εδώ μόνο η μορφή.

export const GDPR_KINDS = ["export", "anonymize"] as const;
export const SUBJECT_KINDS = [
  "team_user",
  "client_user",
  "contact",
  "client",
] as const;
export const PERSON_KINDS = ["team_user", "client_user", "contact"] as const;
export const ANONYMIZE_BLOCKS = [
  "not_found",
  "anonymized",
  "active",
  "member",
  "contact_is_user",
  "archived",
  "kind",
] as const;

export type GdprKind = (typeof GDPR_KINDS)[number];
export type SubjectKind = (typeof SUBJECT_KINDS)[number];
export type PersonKind = (typeof PERSON_KINDS)[number];
export type AnonymizeBlock = (typeof ANONYMIZE_BLOCKS)[number];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = z.string().regex(DAY);
const blockSchema = z.enum(ANONYMIZE_BLOCKS).nullable();

// ───────────── Φόρμες ─────────────

// Το υποκείμενο έρχεται από ένα select ως «είδος:id».
export const subjectRefSchema = z
  .string()
  .transform((value) => {
    const [kind, id] = value.split(":");
    return { kind, id };
  })
  .pipe(z.object({ kind: z.enum(SUBJECT_KINDS), id: z.uuid() }));

export const subjectRef = (kind: SubjectKind, id: string): string =>
  `${kind}:${id}`;

export const requestInputSchema = z.object({
  kind: z.enum(GDPR_KINDS, { error: "Διάλεξε είδος αιτήματος." }),
  subject: subjectRefSchema,
  receivedOn: z.union([z.literal(""), day]).transform((value) => value || null),
  note: z.string().trim().max(1000, "Η σημείωση είναι έως 1000 χαρακτήρες."),
});

export const completeInputSchema = z.object({
  id: z.uuid(),
  completedOn: z
    .union([z.literal(""), day])
    .transform((value) => value || null),
  note: z.string().trim().max(1000, "Η σημείωση είναι έως 1000 χαρακτήρες."),
});

export const anonymizeInputSchema = z.object({
  subjectKind: z.enum(PERSON_KINDS),
  subjectId: z.uuid(),
  typedName: z
    .string()
    .trim()
    .min(1, "Γράψε το όνομα για επιβεβαίωση.")
    .max(200),
});

export const exportInputSchema = z.object({
  subjectKind: z.enum(SUBJECT_KINDS),
  subjectId: z.uuid(),
});

// ───────────── Από τη βάση ─────────────

export const requestSchema = z.object({
  id: z.string(),
  kind: z.enum(GDPR_KINDS),
  subjectKind: z.enum(SUBJECT_KINDS),
  subjectId: z.string(),
  subjectLabel: z.string(),
  receivedOn: day,
  deadline: day,
  completedOn: day.nullable(),
  note: z.string(),
  daysLeft: z.number().int(),
});

export const registerSchema = z.object({
  today: day,
  requests: z.array(requestSchema),
});

export const subjectsSchema = z.object({
  teamUsers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      isActive: z.boolean(),
      block: blockSchema,
    }),
  ),
  clientUsers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      clientIds: z.array(z.string()),
      block: blockSchema,
    }),
  ),
  clients: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      contactName: z.string(),
      contactBlock: blockSchema,
    }),
  ),
});

const scalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const exportRowSchema = z.record(z.string(), scalar);

export const exportSchema = z.object({
  subject: z.object({
    kind: z.enum(SUBJECT_KINDS),
    id: z.string(),
    label: z.string(),
  }),
  sections: z.record(
    z.string(),
    z.union([exportRowSchema, z.array(exportRowSchema), z.null()]),
  ),
});

export type GdprRequest = z.infer<typeof requestSchema>;
export type GdprRegister = z.infer<typeof registerSchema>;
export type GdprSubjects = z.infer<typeof subjectsSchema>;
export type ExportRow = z.infer<typeof exportRowSchema>;
export type GdprExportData = z.infer<typeof exportSchema>;
