import { z } from "zod";

import type {
  AgreementRow,
  ApprovalItem,
  CatalogueOption,
  Deviation,
  KindInfo,
  OutboxItem,
  ProposalSummary,
} from "./types";

// Τα δομικά στοιχεία των schemas ανάγνωσης και οι γραμμές των RPC που επιστρέφουν πίνακα.
// Η βάση μιλά snake_case· το camelize τα κάνει camelCase πριν από τον έλεγχο, ώστε τα schemas να γράφονται μία φορά.

const camelKey = (key: string): string =>
  key.replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());

// Μόνο τα κλειδιά αλλάζουν, ποτέ οι τιμές. Τα JSON της βάσης δεν έχουν κλειδιά-δεδομένα (π.χ. id ως κλειδί).
export const camelize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(camelize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [
      camelKey(key),
      camelize(inner),
    ]),
  );
};

// Ένα schema που δέχεται το JSON όπως το δίνει η βάση.
export const fromDatabase = <T>(schema: z.ZodType<T>): z.ZodType<T, unknown> =>
  z.unknown().transform(camelize).pipe(schema);

// Το z.coerce.number().nullable() θα έκανε το null 0 (ΟΧΙ μηδέν: «δεν δικαιούσαι να το δεις»), γι' αυτό η ένωση.
export const nullableNumber = z.union([z.null(), z.coerce.number()]);

export const kindSchema = z.enum(["monthly", "one_off"]);
export const stateSchema = z.enum([
  "proposal",
  "signed",
  "active",
  "expired",
  "dissolved",
]);
export const pathSchema = z.enum([
  "draft",
  "awaiting_approval",
  "sent",
  "expired",
  "signed",
  "lost",
]);
export const languageSchema = z.enum(["el", "en"]);
export const unusedSchema = z.enum(["lost", "next_period", "accumulate"]);
export const renewalSchema = z.enum(["new_opportunity", "auto"]);
export const milestoneTriggerSchema = z.enum([
  "signature",
  "date",
  "filming_done",
  "delivered",
]);
export const linkStatusSchema = z.enum([
  "active",
  "expired",
  "revoked",
  "superseded",
  "signed",
  "closed",
]);

export const deviationSchema: z.ZodType<Deviation> = z.object({
  key: z.string(),
  kind: z.enum([
    "free_line",
    "price",
    "provisions",
    "discount_percent",
    "discount_months",
    "payment_days",
    "grace_days",
    "unused_provisions",
    "dissolution_notice",
    "dissolution_fee",
    "filming_notice",
    "cancel_hours",
    "late_cancel_burns",
    "no_show_burns",
    "revision_limit",
    "advance",
  ]),
  subject: z.string(),
  depth: z.number().nullable(),
  baseValue: z.string().nullable(),
  value: z.string().nullable(),
  status: z.enum(["new", "deeper", "covered"]),
});

// ───────────── Γραμμές των RPC που επιστρέφουν πίνακα ─────────────

const rows = <T>(schema: z.ZodType<T>): z.ZodType<T[], unknown> =>
  fromDatabase(z.array(schema));

export const agreementRowsSchema = rows<AgreementRow>(
  z.object({
    id: z.string(),
    opportunityId: z.string(),
    clientId: z.string(),
    clientName: z.string(),
    title: z.string(),
    kind: kindSchema,
    state: stateSchema,
    path: pathSchema,
    revision: z.coerce.number(),
    managerId: z.string().nullable(),
    managerName: z.string().nullable(),
    validUntil: z.string(),
    startOn: z.string().nullable(),
    endOn: z.string().nullable(),
    signedAt: z.string().nullable(),
    signatoryName: z.string().nullable(),
    total: nullableNumber,
    discountPercent: nullableNumber,
    discountMonths: nullableNumber,
    changeRequestsOpen: z.coerce.number(),
    linksOpened: z.coerce.number(),
    expiresInDays: nullableNumber,
    isLowMargin: z.boolean().nullable(),
    updatedAt: z.string(),
  }),
);

export const summaryRowsSchema = rows<ProposalSummary>(
  z.object({
    agreementId: z.string(),
    kind: kindSchema,
    title: z.string(),
    state: stateSchema,
    path: pathSchema,
    revision: z.coerce.number(),
    validUntil: z.string(),
    signedAt: z.string().nullable(),
    signatoryName: z.string().nullable(),
    total: nullableNumber,
    linksTotal: z.coerce.number(),
    linksOpened: z.coerce.number(),
    changeRequestsOpen: z.coerce.number(),
    approvalPendingDays: nullableNumber,
    needsApproval: z.boolean(),
    deviationCount: z.coerce.number(),
    hasLines: z.boolean(),
    outboxPending: z.coerce.number(),
    canDraft: z.boolean(),
    canDeviate: z.boolean(),
  }),
);

const approvalLineSchema = z.object({
  description: z.string(),
  quantity: z.number(),
  catalogPrice: z.number().nullable(),
  unitPrice: z.number().nullable(),
  isFree: z.boolean(),
  isBelow: z.boolean(),
});

export const approvalRowsSchema = rows<ApprovalItem>(
  z.object({
    agreementId: z.string(),
    opportunityId: z.string(),
    clientName: z.string(),
    title: z.string(),
    kind: kindSchema,
    revision: z.coerce.number(),
    managerName: z.string().nullable(),
    requestedAt: z.string(),
    requestedByName: z.string().nullable(),
    pendingDays: z.coerce.number(),
    workingDays: z.coerce.number(),
    isReminderDue: z.boolean(),
    total: nullableNumber,
    isLowMargin: z.boolean().nullable(),
    deviations: z.array(deviationSchema),
    lines: z.array(approvalLineSchema),
    previous: z
      .object({
        revision: z.number(),
        decidedByName: z.string().nullable(),
        decidedAt: z.string().nullable(),
        comment: z.string(),
      })
      .nullable(),
  }),
);

export const outboxRowsSchema = rows<OutboxItem>(
  z.object({
    id: z.string(),
    kind: z.enum([
      "proposal_link",
      "signing_code",
      "signed_copy",
      "client_invite",
    ]),
    toName: z.string(),
    toEmail: z.string(),
    status: z.enum(["pending", "sent", "manual", "cancelled", "failed"]),
    createdAt: z.string(),
    handledAt: z.string().nullable(),
    linkPath: z.string().nullable(),
    code: z.string().nullable(),
    codeExpiresAt: z.string().nullable(),
  }),
);

export const optionRowsSchema = rows<CatalogueOption>(
  z.object({
    itemId: z.string(),
    kind: z.enum(["package", "service"]),
    billing: kindSchema.nullable(),
    name: z.string(),
    unit: z.string(),
    price: nullableNumber,
    provisions: z
      .array(z.object({ kindId: z.string(), quantity: z.number() }))
      .nullable()
      .transform((list) => list ?? []),
  }),
);

// Το provision_kinds διαβάζεται κατευθείαν (η μόνη άμεση ανάγνωση πίνακα του module): retired_at → isRetired.
export const kindRowsSchema: z.ZodType<KindInfo[], unknown> = fromDatabase(
  z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        labelEn: z.string(),
        unit: z.string(),
        unitEn: z.string(),
        sort: z.coerce.number(),
        revisionLimit: nullableNumber,
        retiredAt: z.string().nullable(),
      }),
    )
    .transform((list) =>
      list.map(({ retiredAt, ...kind }) => ({
        ...kind,
        isRetired: retiredAt !== null,
      })),
    ),
);
