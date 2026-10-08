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

export const createOpportunitySchema = z
  .object({
    clientId: z.union([z.literal(""), z.uuid()]), // "" = νέος Πελάτης (τότε ισχύει και το clientFieldsSchema)
    title: text.min(1, "Γράψε τον τίτλο της Ευκαιρίας."),
    sourceId: z.uuid("Διάλεξε Πηγή."),
    referredBy: text,
  })
  .extend(nextStepSchema.shape);

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

export const logActivitySchema = z.object({
  opportunityId: z.uuid(),
  kindId: z.uuid("Διάλεξε είδος Δραστηριότητας."),
  body: text.min(1, "Γράψε τι έγινε."),
});

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
  sourceId: z.uuid("Διάλεξε Πηγή."),
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

export const resolveDuplicateSchema = z.object({ flagId: z.uuid() });

export const mergeSchema = z
  .object({ survivorId: z.uuid(), absorbedId: z.uuid() })
  .refine((v) => v.survivorId !== v.absorbedId, {
    message: "Διάλεξε δύο διαφορετικούς Πελάτες.",
    path: ["survivorId"],
  });
