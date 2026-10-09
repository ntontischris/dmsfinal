import { z } from "zod";

import type { AgreementDetail } from "./types";
import {
  deviationSchema,
  fromDatabase,
  kindSchema,
  languageSchema,
  linkStatusSchema,
  milestoneTriggerSchema,
  pathSchema,
  renewalSchema,
  stateSchema,
  unusedSchema,
} from "./view-schema-parts";

// Έλεγχος των JSON της βάσης (§2.7) και μετατροπή σε camelCase. Το null σε ποσό, ώρες ή κόστος μένει null:
// σημαίνει «δεν δικαιούσαι να το δεις» και δεν γίνεται ποτέ μηδέν. Τα booleans είναι πάντα true/false (ποτέ nullable).

const nullableNumber = z.number().nullable();
const nullableString = z.string().nullable();

const provisionSchema = z.object({
  kindId: z.string(),
  quantity: z.number(),
  catalogQuantity: nullableNumber,
});

const lineSchema = z.object({
  id: z.string(),
  position: z.number(),
  kind: z.enum(["package", "service", "free"]),
  itemId: nullableString,
  description: z.string(),
  descriptionEn: z.string(),
  unit: z.string(),
  quantity: z.number(),
  unitPrice: nullableNumber,
  catalogPrice: nullableNumber,
  lineTotal: nullableNumber,
  hoursShoot: nullableNumber,
  hoursEdit: nullableNumber,
  directCost: nullableNumber,
  provisions: z.array(provisionSchema),
});

const termsSchema = z.object({
  paymentDays: z.number(),
  unusedProvisions: unusedSchema,
  graceDays: z.number(),
  renewal: renewalSchema.nullable(),
  dissolutionNoticeDays: z.number(),
  filmingNoticeHours: z.number(),
  filmingCancelHours: z.number(),
  lateCancelBurns: z.boolean(),
  noShowBurns: z.boolean(),
});

const baselineSchema = z.object({
  paymentDays: z.number(),
  unusedProvisions: unusedSchema,
  graceDays: z.number(),
  dissolutionNoticeDays: z.number(),
  dissolutionFee: nullableNumber,
  filmingNoticeHours: z.number(),
  filmingCancelHours: z.number(),
  lateCancelBurns: z.boolean(),
  noShowBurns: z.boolean(),
  standardDiscountPercent: z.number(),
  standardDiscountMonths: z.number(),
  advancePercent: z.number(),
});

const approvalSchema = z.object({
  state: z.enum(["pending", "approved", "rejected", "withdrawn"]),
  requestedAt: nullableString,
  requestedByName: nullableString,
  decidedAt: nullableString,
  decidedByName: nullableString,
  comment: z
    .string()
    .nullable()
    .transform((text) => text ?? ""),
});

const linkSchema = z.object({
  id: z.string(),
  status: linkStatusSchema,
  isOpened: z.boolean(),
  openCount: z.number(),
  firstOpenedAt: nullableString,
});

const signatureSchema = z.object({
  method: z.enum(["link", "outside"]),
  signedName: z.string(),
  signedOn: z.string(),
  recordedAt: z.string(),
  otpDelivery: z.enum(["manual", "email"]).nullable(),
  documentHash: z.string(),
  reference: nullableString,
  ip: nullableString,
  usedProvisions: z
    .array(z.object({ kindId: z.string(), used: z.number() }))
    .nullable(),
  monthInvoiced: z.boolean().nullable(),
});

const costSchema = z.object({
  hourCost: nullableNumber,
  hourCostMonth: nullableString,
  estimatedCost: nullableNumber,
  multiplierMin: z.number(),
  multiplierTarget: z.number(),
  multiplierMax: z.number(),
  isLowMargin: z.boolean(),
  isFrozen: z.boolean(),
});

const periodSchema = z.object({
  n: z.number(),
  starts: z.string(),
  ends: z.string(),
  isPartial: z.boolean(),
  givesProvisions: z.boolean(),
  isDiscounted: z.boolean(),
  state: z.enum(["closed", "current", "next"]),
  amount: nullableNumber,
  productionId: nullableString,
});

const canSchema = z.object({
  seeAmounts: z.boolean(),
  seeCost: z.boolean(),
  manageCost: z.boolean(),
  edit: z.boolean(),
  editPrices: z.boolean(),
  editCost: z.boolean(),
  send: z.boolean(),
  requestApproval: z.boolean(),
  withdrawApproval: z.boolean(),
  decide: z.boolean(),
  newRevision: z.boolean(),
  extend: z.boolean(),
  closeLost: z.boolean(),
  manageLinks: z.boolean(),
  signOutside: z.boolean(),
});

const detailSchema = z.object({
  id: z.string(),
  kind: kindSchema,
  title: z.string(),
  language: languageSchema,
  state: stateSchema,
  path: pathSchema,
  revision: z.number(),
  validUntil: z.string(),
  startOn: nullableString,
  endOn: nullableString,
  durationMonths: nullableNumber,
  signedAt: nullableString,
  updatedAt: z.string(),
  opportunity: z.object({
    id: z.string(),
    title: z.string(),
    outcome: z.enum(["open", "won", "lost"]),
    managerId: nullableString,
    managerName: nullableString,
  }),
  client: z.object({
    id: z.string(),
    name: z.string(),
    contactName: z.string(),
    contactEmail: z.string(),
  }),
  terms: termsSchema,
  moneyTerms: z
    .object({
      discountPercent: z.number(),
      discountMonths: z.number(),
      dissolutionFee: z.number(),
      vatRate: z.number(),
    })
    .nullable(),
  baseline: baselineSchema.nullable(),
  lines: z.array(lineSchema),
  milestones: z.array(
    z.object({
      id: z.string(),
      trigger: milestoneTriggerSchema,
      percent: z.number(),
      dueOn: nullableString,
      amount: nullableNumber,
    }),
  ),
  milestonesTotal: z.number(),
  revisionLimits: z.array(
    z.object({
      kindId: z.string(),
      label: z.string(),
      labelEn: z.string(),
      rounds: z.number(),
      baseRounds: nullableNumber,
    }),
  ),
  recipients: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      isSignatory: z.boolean(),
      link: linkSchema.nullable(),
    }),
  ),
  revisions: z.array(
    z.object({
      number: z.number(),
      createdAt: z.string(),
      createdByName: nullableString,
      summary: z
        .string()
        .nullable()
        .transform((text) => text ?? ""),
      sentAt: nullableString,
      approval: approvalSchema.nullable(),
    }),
  ),
  deviations: z.array(deviationSchema),
  needsApproval: z.boolean(),
  totals: z
    .object({
      price: z.number(),
      discountedPrice: z.number(),
      vatRate: z.number(),
      vat: z.number(),
      gross: z.number(),
    })
    .nullable(),
  cost: costSchema.nullable(),
  periods: z.array(periodSchema),
  changeRequests: z.array(
    z.object({
      id: z.string(),
      revision: z.number(),
      fromName: z.string(),
      message: z.string(),
      createdAt: z.string(),
    }),
  ),
  signature: signatureSchema.nullable(),
  document: z
    .object({ revision: z.number(), hash: z.string(), createdAt: z.string() })
    .nullable(),
  outboxPending: z.number(),
  emailSenderConnected: z.boolean(),
  proposalValidityDays: z.number(),
  can: canSchema,
});

export const agreementViewSchema: z.ZodType<AgreementDetail, unknown> =
  fromDatabase(detailSchema);

export {
  documentSchema,
  publicResultSchema,
  publicViewSchema,
} from "./view-schema-public-parts";
