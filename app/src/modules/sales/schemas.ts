import { z } from "zod";

import { isValidAfm } from "@/modules/settings";

// Έλεγχος των φορμών Πελατών και Ευκαιριών στο όριο του server. Τα μηνύματα είναι αυτά που βλέπει ο χρήστης.

const text = z.string().trim();

export const clientFieldsSchema = z.object({
  name: text.min(1, "Γράψε το όνομα του Πελάτη."),
  legalName: text,
  city: text,
  afm: text.refine(
    (v) => v === "" || isValidAfm(v),
    "Το ΑΦΜ δεν είναι έγκυρο (9 ψηφία, σωστό ψηφίο ελέγχου).",
  ),
  contactName: text.min(1, "Γράψε το κύριο πρόσωπο επικοινωνίας."),
  contactEmail: text.pipe(
    z.email("Το email του κύριου προσώπου δεν είναι έγκυρο."),
  ),
  contactPhone: text,
});

export const nextStepSchema = z.object({
  nextStep: text.min(1, "Γράψε το Επόμενο βήμα."),
  nextStepDue: z.iso.date("Διάλεξε ημερομηνία για το Επόμενο βήμα."),
});

// "" = χωρίς Πηγή: για υπάρχοντα Πελάτη η βάση παίρνει την Πηγή του (από πού ήρθε).
const optionalSource = z.union([z.literal(""), z.uuid("Διάλεξε Πηγή.")]);

export const createOpportunitySchema = z
  .object({
    clientId: z.union([z.literal(""), z.uuid()]), // "" = νέος Πελάτης (τότε ισχύει και το clientFieldsSchema)
    title: text.min(1, "Γράψε τον τίτλο της Ευκαιρίας."),
    sourceId: optionalSource,
    referredBy: text,
  })
  .extend(nextStepSchema.shape)
  .refine((v) => v.clientId !== "" || v.sourceId !== "", {
    message: "Διάλεξε Πηγή.",
    path: ["sourceId"],
  });

export const updateClientSchema = clientFieldsSchema.extend({
  clientId: z.uuid(),
});

export const updateOpportunitySchema = z
  .object({
    opportunityId: z.uuid(),
    title: text.min(1, "Γράψε τον τίτλο της Ευκαιρίας."),
    stageId: z.uuid("Διάλεξε Στάδιο."),
  })
  .extend(nextStepSchema.shape);

export const moveStageSchema = z.object({
  opportunityId: z.uuid(),
  stageId: z.uuid("Διάλεξε Στάδιο."),
});

// «Πότε έγινε» από <input type="datetime-local">, σε ώρα Αθήνας· "" = τώρα.
const LOCAL_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const occurredAt = z
  .string()
  .refine((v) => v === "" || LOCAL_TIME.test(v), "Διάλεξε πότε έγινε.");
const activityFields = {
  kindId: z.uuid("Διάλεξε είδος Δραστηριότητας."),
  body: text.min(1, "Γράψε τι έγινε."),
  occurredAt,
};

// Σε Ευκαιρία (opportunityId) ή κατευθείαν στον Πελάτη (clientId, με opportunityId "").
export const logActivitySchema = z
  .object({
    opportunityId: z.union([z.literal(""), z.uuid()]),
    clientId: z.union([z.literal(""), z.uuid()]),
    ...activityFields,
  })
  .refine((v) => v.opportunityId !== "" || v.clientId !== "", {
    message: "Διάλεξε Πελάτη ή Ευκαιρία.",
    path: ["opportunityId"],
  });

export const editActivitySchema = z.object({
  activityId: z.uuid(),
  ...activityFields,
  occurredAt: z.string().regex(LOCAL_TIME, "Διάλεξε πότε έγινε."),
});

export const activityRefSchema = z.object({ activityId: z.uuid() });

export const closeLostSchema = z.object({
  opportunityId: z.uuid(),
  lossReasonId: z.uuid("Διάλεξε Λόγο απώλειας."),
});

export const followUpSchema = z
  .object({
    lostId: z.uuid(),
    title: text.min(1, "Γράψε τον τίτλο της νέας Ευκαιρίας."),
    sourceId: z.uuid("Διάλεξε Πηγή."),
  })
  .extend(nextStepSchema.shape);

export const requestAccessSchema = z.object({
  clientId: z.uuid(),
  topic: text.min(1, "Γράψε τι αφορά."),
  comment: text,
  sourceId: optionalSource,
});

export const assignSchema = z.object({
  opportunityId: z.uuid(),
  userId: z.uuid("Διάλεξε Υπεύθυνο."),
});

export const transferSchema = z.object({
  clientId: z.uuid(),
  userId: z.uuid("Διάλεξε Υπεύθυνο."),
  requestId: z.union([z.literal(""), z.uuid()]),
});

export const decideAccessSchema = z
  .object({
    requestId: z.uuid(),
    decision: z.enum(["approve", "reject"]),
    comment: text,
  })
  .refine((v) => v.decision === "approve" || v.comment !== "", {
    message: "Γράψε σχόλιο απόρριψης για τον πωλητή.",
    path: ["comment"],
  });

export const deleteClientSchema = z.object({
  clientId: z.uuid(),
  confirmName: text.min(1, "Γράψε το όνομα του Πελάτη για επιβεβαίωση."),
});

export const resolveDuplicateSchema = z.object({ flagId: z.uuid() });

export const mergeSchema = z
  .object({ survivorId: z.uuid(), absorbedId: z.uuid() })
  .refine((v) => v.survivorId !== v.absorbedId, {
    message: "Διάλεξε δύο διαφορετικούς Πελάτες.",
    path: ["survivorId"],
  });

// Πρόβλεψη (b3): "" = δεν γράφτηκε (Αξία από την πρόταση, Πιθανότητα από το Στάδιο, χωρίς κλείσιμο).
// Το ποσό δέχεται ελληνική υποδιαστολή («1.500,50» ή «1500,5»).
const MONEY = /^\d{1,10}([.,]\d{1,2})?$/;
const toMoney = (v: string): string => {
  const plain = v.replace(/\s/g, "");
  return /,/.test(plain) ? plain.replace(/\./g, "").replace(",", ".") : plain;
};
const optionalMoney = text
  .transform(toMoney)
  .refine(
    (v) => v === "" || MONEY.test(v),
    "Γράψε την Αξία σε ευρώ (π.χ. 1500).",
  )
  .transform((v) => (v === "" ? null : Number(v)));
const optionalPercent = text
  .refine(
    (v) => v === "" || (/^\d{1,3}$/.test(v) && Number(v) <= 100),
    "Η Πιθανότητα είναι από 0 έως 100%.",
  )
  .transform((v) => (v === "" ? null : Number(v)));
const optionalDate = z
  .union([z.literal(""), z.iso.date("Διάλεξε ημερομηνία κλεισίματος.")])
  .transform((v) => (v === "" ? null : v));

export const forecastSchema = z.object({
  opportunityId: z.uuid(),
  value: optionalMoney,
  probability: optionalPercent,
  expectedClose: optionalDate,
  // "1" = η φόρμα δεν έδειξε Αξία (ο Χρήστης δεν βλέπει ποσά): η Αξία μένει όπως είναι.
  keepValue: z.string().transform((v) => v === "1"),
});

// Προεπιλεγμένη Πιθανότητα Σταδίου (O2): "" = χωρίς προεπιλογή (μετρά 0%).
export const stageProbabilitySchema = z.object({
  id: z.uuid(),
  probability: optionalPercent,
});
