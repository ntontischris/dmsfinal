import type { z } from "zod";

import type {
  milestonesFieldSchema,
  provisionsFieldSchema,
  recipientsFieldSchema,
  revisionLimitsFieldSchema,
} from "./schemas";

// Κλειδιά φορμών και μετατροπή των λιστών στο σχήμα που περιμένει η βάση (snake_case). Καθαρές συναρτήσεις·
// οι ενέργειες ζουν στο actions-draft.ts.

export const BASICS_KEYS = [
  "agreementId",
  "title",
  "language",
  "validUntil",
  "startOnSignature",
  "startOn",
] as const;

export const TERMS_KEYS = [
  "agreementId",
  "kind",
  "paymentDays",
  "unusedProvisions",
  "graceDays",
  "renewal",
  "dissolutionNoticeDays",
  "filmingNoticeHours",
  "filmingCancelHours",
  "lateCancelBurns",
  "noShowBurns",
] as const;

export const MONEY_TERMS_KEYS = [
  "agreementId",
  "discountPercent",
  "discountMonths",
  "dissolutionFee",
] as const;

export const LINE_KEYS = [
  "quantity",
  "description",
  "descriptionEn",
  "unitPrice",
  "hoursShoot",
  "hoursEdit",
  "directCost",
] as const;

// Οι δόσεις που δεν κάνουν 100% είναι προειδοποίηση, όχι εμπόδιο.
export const totalPercent = (percents: readonly number[]): number =>
  Math.round(percents.reduce((sum, value) => sum + value, 0) * 100) / 100;

export const milestoneArgs = (
  milestones: z.infer<typeof milestonesFieldSchema>,
) =>
  milestones.map((m) => ({
    trigger: m.trigger,
    percent: m.percent,
    due_on: m.dueOn,
  }));

export const limitArgs = (limits: z.infer<typeof revisionLimitsFieldSchema>) =>
  limits.map((l) => ({ kind_id: l.kindId, rounds: l.rounds }));

export const recipientArgs = (
  recipients: z.infer<typeof recipientsFieldSchema>,
) =>
  recipients.map((r) => ({
    name: r.name,
    email: r.email,
    is_signatory: r.isSignatory,
  }));

export const provisionArgs = (
  provisions: z.infer<typeof provisionsFieldSchema>,
) => provisions.map((p) => ({ kind_id: p.kindId, quantity: p.quantity }));
