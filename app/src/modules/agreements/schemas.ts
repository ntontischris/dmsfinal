import { z } from "zod";

import {
  PERCENT_RULE,
  checkbox,
  dateField,
  int,
  isRealDate,
  moneySchema,
  nullableInt,
  numberField,
  optionalHours,
  optionalInt,
  optionalMoney,
  text,
  usedFieldSchema,
} from "./schemas-parts";

export {
  milestonesFieldSchema,
  moneySchema,
  provisionsFieldSchema,
  recipientsFieldSchema,
  revisionLimitsFieldSchema,
} from "./schemas-parts";

// ───────────── Φόρμες της πρότασης ─────────────

const agreementId = z.uuid();

export const createAgreementSchema = z.object({
  opportunityId: z.uuid(),
  kind: z.enum(["monthly", "one_off"], "Διάλεξε μηνιαία ή εφάπαξ."),
  title: text,
});

export const agreementRefSchema = z.object({ agreementId });
export const lineRefSchema = z.object({ lineId: z.uuid() });
export const linkRefSchema = z.object({ linkId: z.uuid() });

const DURATION_MESSAGE = "Η Διάρκεια είναι από 1 έως 60 μήνες.";

// Ισχύς, Έναρξη, Διάρκεια. «Με την υπογραφή» = χωρίς ημερομηνία (null)· η εφάπαξ δεν στέλνει Διάρκεια.
export const basicsSchema = z
  .object({
    agreementId,
    title: text.min(1, "Γράψε τον τίτλο."),
    language: z.enum(["el", "en"], "Διάλεξε γλώσσα."),
    validUntil: dateField("Γράψε την Ισχύς."),
    startOnSignature: checkbox,
    startOn: text,
    durationMonths: int(1, 60, DURATION_MESSAGE).optional(),
  })
  .refine((v) => v.startOnSignature || isRealDate(v.startOn), {
    message: "Γράψε την Έναρξη ή διάλεξε «με την υπογραφή».",
    path: ["startOn"],
  })
  .transform((v) => ({
    agreementId: v.agreementId,
    title: v.title,
    language: v.language,
    validUntil: v.validUntil,
    startOn: v.startOnSignature ? null : v.startOn,
    durationMonths: v.durationMonths ?? null,
  }));

const MONTHLY_ONLY_MESSAGES = {
  unusedProvisions: "Διάλεξε τι γίνεται με τις αχρησιμοποίητες Παροχές.",
  graceDays: "Γράψε την Περίοδο χάριτος.",
  renewal: "Διάλεξε τι γίνεται στη λήξη.",
  dissolutionNoticeDays: "Γράψε την Ειδοποίηση λύσης.",
} as const;

// Η φόρμα στέλνει το είδος (κρυφό πεδίο kind): στη μηνιαία τα πεδία «μόνο της μηνιαίας» είναι υποχρεωτικά,
// αλλιώς η βάση τα απορρίπτει (NOT NULL / έλεγχος ανανέωσης) με γενικό μήνυμα. Χωρίς kind: ελέγχει μόνο η βάση.
export const termsSchema = z
  .object({
    agreementId,
    kind: z.enum(["monthly", "one_off"]).optional(),
    paymentDays: int(0, 365),
    unusedProvisions: z
      .enum(
        ["lost", "next_period", "accumulate"],
        "Διάλεξε τι γίνεται με τις αχρησιμοποίητες Παροχές.",
      )
      .or(z.literal(""))
      .transform((value) => (value === "" ? null : value)),
    graceDays: nullableInt(0, 365),
    renewal: z
      .enum(["new_opportunity", "auto"], "Διάλεξε τι γίνεται στη λήξη.")
      .or(z.literal(""))
      .transform((value) => (value === "" ? null : value)),
    dissolutionNoticeDays: nullableInt(0, 365),
    filmingNoticeHours: int(0, 720),
    filmingCancelHours: int(0, 720),
    lateCancelBurns: checkbox,
    noShowBurns: checkbox,
  })
  .superRefine((v, ctx) => {
    if (v.kind !== "monthly") return;
    for (const field of Object.keys(MONTHLY_ONLY_MESSAGES) as Array<
      keyof typeof MONTHLY_ONLY_MESSAGES
    >) {
      if (v[field] === null)
        ctx.addIssue({
          code: "custom",
          message: MONTHLY_ONLY_MESSAGES[field],
          path: [field],
        });
    }
  });

export const moneyTermsSchema = z
  .object({
    agreementId,
    discountPercent: numberField(PERCENT_RULE),
    discountMonths: int(0, 60),
    dissolutionFee: moneySchema,
  })
  .refine((v) => v.discountPercent > 0 === v.discountMonths > 0, {
    message: "Η έκπτωση θέλει και ποσοστό και μήνες.",
    path: ["discountMonths"],
  });

export const addCatalogueLineSchema = z.object({
  agreementId,
  itemId: z.uuid(),
  quantity: int(1, 999, "Η ποσότητα είναι ακέραιος από 1 έως 999."),
});

export const addFreeLineSchema = z.object({
  agreementId,
  description: text.min(1, "Γράψε την περιγραφή."),
  descriptionEn: text,
  price: moneySchema,
});

// Απουσία κλειδιού = δεν αλλάζει: η D2 δείχνει κάθε πεδίο μόνο σε όποιον μπορεί να το γράψει.
export const updateLineSchema = z.object({
  lineId: z.uuid(),
  quantity: optionalInt(1, 999, "Η ποσότητα είναι ακέραιος από 1 έως 999."),
  description: text.optional(),
  descriptionEn: text.optional(),
  unitPrice: optionalMoney,
  hoursShoot: optionalHours,
  hoursEdit: optionalHours,
  directCost: optionalMoney,
});

export const newRevisionSchema = agreementRefSchema.extend({
  summary: text.optional(),
});

// «» = η προεπιλογή του O3.
export const extendSchema = agreementRefSchema.extend({
  days: nullableInt(1, 365),
});

export const closeLostSchema = agreementRefSchema.extend({
  lossReasonId: z.uuid("Διάλεξε Λόγο απώλειας."),
});

export const decideSchema = agreementRefSchema
  .extend({ decision: z.enum(["approve", "reject"]), comment: text })
  .refine((v) => v.decision === "approve" || v.comment !== "", {
    message: "Γράψε σχόλιο: τι να αλλάξει ο Υπεύθυνος.",
    path: ["comment"],
  });

export const outboxMarkSchema = z.object({
  outboxId: z.uuid(),
  status: z.enum(["manual", "cancelled"]),
});

export const signOutsideSchema = z.object({
  agreementId,
  signedOn: dateField("Γράψε την ημερομηνία υπογραφής."),
  signedBy: text.min(1, "Γράψε ποιος υπέγραψε."),
  start: dateField("Γράψε την Έναρξη."),
  reference: text.min(3, "Γράψε το αρχείο της υπογραφής (όνομα ή σύνδεσμος)."),
  used: usedFieldSchema,
  invoiced: checkbox,
});

// ───────────── D5: δημόσιες ενέργειες ─────────────

export const publicTokenSchema = z.string().regex(/^[0-9a-f]{64}$/);

export const requestCodeSchema = z.object({
  token: publicTokenSchema,
  name: text.min(1).max(120),
  accepted: z.literal(true),
});

export const signSchema = z.object({
  token: publicTokenSchema,
  code: z.string().regex(/^\d{6}$/),
});

export const changesSchema = z.object({
  token: publicTokenSchema,
  message: text.min(1).max(2000),
});

export const declineSchema = z.object({
  token: publicTokenSchema,
  reason: text.max(1000),
});
