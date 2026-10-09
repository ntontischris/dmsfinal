import { z } from "zod";

import type { ProposalDocument, PublicProposal, PublicResult } from "./types";
import {
  fromDatabase,
  kindSchema,
  languageSchema,
  linkStatusSchema,
  milestoneTriggerSchema,
  renewalSchema,
  unusedSchema,
} from "./view-schema-parts";

// Το έγγραφο του πελάτη και τα αποτελέσματα του Συνδέσμου (D5). Εξάγονται από το view-schema.ts.
// Άγνωστο status ή σχήμα δίνει σφάλμα: ποτέ «μάντεμα».

const nullableNumber = z.number().nullable();
const nullableString = z.string().nullable();

// ───────────── Το έγγραφο του πελάτη ─────────────

const provisionTextSchema = z.object({
  label: z.string(),
  labelEn: z.string(),
  unit: z.string(),
  unitEn: z.string(),
  quantity: z.number(),
});

const documentShape = z.object({
  revision: z.number(),
  language: languageSchema,
  title: z.string(),
  kind: kindSchema,
  validUntil: z.string(),
  startOn: nullableString,
  durationMonths: nullableNumber,
  company: z.object({
    legalName: z.string(),
    tradeName: z.string(),
    taxId: z.string(),
    taxOffice: z.string(),
    gemi: z.string(),
    address: z.string(),
    phone: z.string(),
    email: z.string(),
    signatoryName: z.string(),
    signatoryTitle: z.string(),
  }),
  client: z.object({
    name: z.string(),
    legalName: z.string(),
    afm: nullableString,
    city: z.string(),
  }),
  lines: z.array(
    z.object({
      description: z.string(),
      descriptionEn: z.string(),
      unit: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      lineTotal: z.number(),
      provisions: z.array(provisionTextSchema),
    }),
  ),
  provisionTotals: z.array(provisionTextSchema),
  totals: z.object({
    net: z.number(),
    discountPercent: z.number(),
    discountMonths: z.number(),
    discountedNet: z.number(),
    vatRate: z.number(),
    vat: z.number(),
    gross: z.number(),
    discountedVat: z.number(),
    discountedGross: z.number(),
  }),
  terms: z.object({
    paymentDays: z.number(),
    unusedProvisions: unusedSchema,
    graceDays: z.number(),
    renewal: renewalSchema.nullable(),
    dissolutionNoticeDays: z.number(),
    dissolutionFee: z.number(),
    filmingNoticeHours: z.number(),
    filmingCancelHours: z.number(),
    lateCancelBurns: z.boolean(),
    noShowBurns: z.boolean(),
    revisionLimits: z.array(
      z.object({ label: z.string(), labelEn: z.string(), rounds: z.number() }),
    ),
  }),
  milestones: z.array(
    z.object({
      trigger: milestoneTriggerSchema,
      percent: z.number(),
      dueOn: nullableString,
      amount: z.number(),
    }),
  ),
});

export const documentSchema: z.ZodType<ProposalDocument, unknown> =
  fromDatabase(documentShape);

// ───────────── Δημόσια όψη και αποτελέσματα ─────────────

const companySchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
});

const publicBase = {
  language: languageSchema,
  managerName: nullableString,
  company: companySchema,
};

// Το z.union (όχι discriminatedUnion): το "signed" υπάρχει και με και χωρίς ημερομηνία. Άγνωστο status → σφάλμα.
const publicShape = z.union([
  z.object({ status: z.literal("unknown") }),
  z.object({
    ...publicBase,
    status: z.literal("expired"),
    validUntil: z.string(),
  }),
  z.object({
    ...publicBase,
    status: z.literal("signed"),
    signedAt: nullableString.optional().transform((value) => value ?? null),
  }),
  z.object({
    ...publicBase,
    status: z.enum(["revoked", "superseded", "closed"]),
  }),
  z.object({
    ...publicBase,
    status: z.literal("active"),
    document: documentShape,
    validUntil: z.string(),
    canSign: z.boolean(),
    signatoryName: nullableString,
    viewerName: z.string(),
    maskedEmail: z.string(),
    codeChannel: z.enum(["manual", "email"]),
  }),
]);

export const publicViewSchema: z.ZodType<PublicProposal, unknown> =
  fromDatabase(publicShape);

const resultShape = z.union([
  z.object({
    status: z.literal("sent"),
    channel: z.enum(["manual", "email"]),
    maskedEmail: z.string(),
  }),
  z.object({
    status: z.literal("signed"),
    signedAt: nullableString.optional().transform((value) => value ?? null),
  }),
  z.object({ status: z.enum(["ok", "declined"]) }),
  z.object({ status: z.literal("wrong_code"), attemptsLeft: z.number() }),
  z.object({
    status: z.literal("rate_limited"),
    retryAfter: nullableNumber.optional().transform((value) => value ?? null),
  }),
  z.object({
    status: z.enum([
      "locked",
      "code_expired",
      "invalid_name",
      "not_accepted",
      "invalid_message",
      "not_signatory",
      "unknown",
      "error",
    ]),
  }),
  z.object({ status: linkStatusSchema }),
]);

export const publicResultSchema: z.ZodType<PublicResult, unknown> =
  fromDatabase(resultShape);
