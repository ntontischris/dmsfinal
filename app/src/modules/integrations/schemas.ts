import { z } from "zod";

// Σχήματα του module «Ενσωματώσεις και συνδρομές» (N5): ό,τι έρχεται από τη βάση και ό,τι στέλνει η φόρμα.

const at = z.string().nullable();

const checkSchema = z.object({
  lastStartedAt: at,
  lastOkAt: at,
  lastFailedAt: at,
  lastError: z.string().nullable(),
});
export type CheckFacts = z.infer<typeof checkSchema>;

// Η απάντηση του integrations_view: μόνο γεγονότα της βάσης, χωρίς κλειδιά.
export const factsSchema = z.object({
  now: z.string(),
  email: z.object({
    jobOkAt: at,
    jobErrorAt: at,
    jobError: z.string().nullable(),
    lastSentAt: at,
    sentToday: z.number(),
    failedToday: z.number(),
  }),
  google: z.object({
    calendarConnected: z.boolean(),
    lastSyncAt: at,
    lastError: z.string().nullable(),
    errorSince: at,
    pendingWrites: z.number(),
    jobOkAt: at,
  }),
  ai: z.object({
    month: z.string(),
    spentMicros: z.number(),
    capMicros: z.number(),
    lastUsedAt: at,
  }),
  checks: z.object({
    google: checkSchema.optional(),
    email: checkSchema.optional(),
    ai: checkSchema.optional(),
  }),
  analytics: z.object({ ga4: z.string(), pixel: z.string() }),
});
export type IntegrationsFacts = z.infer<typeof factsSchema>;

// ───────────── GA4 και Meta Pixel ─────────────

export const GA4_PATTERN = /^G-[A-Z0-9]{4,16}$/;
export const PIXEL_PATTERN = /^[0-9]{6,20}$/;

export const analyticsIdsSchema = z.object({
  ga4: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "" || GA4_PATTERN.test(value), {
      message:
        "Το Measurement ID του Google Analytics έχει τη μορφή G-XXXXXXXXXX.",
    }),
  pixel: z
    .string()
    .trim()
    .refine((value) => value === "" || PIXEL_PATTERN.test(value), {
      message: "Το Meta Pixel ID έχει μόνο ψηφία (6 έως 20).",
    }),
});
export type AnalyticsIds = z.infer<typeof analyticsIdsSchema>;

// ───────────── Συνδρομές ─────────────

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, { message: `${label}: έως ${max} χαρακτήρες.` });

// Ποσό με κόμμα ή τελεία, έως δύο δεκαδικά.
const money = z
  .string()
  .trim()
  .transform((value) => value.replace(",", "."))
  .refine((value) => /^\d{1,8}(\.\d{1,2})?$/.test(value), {
    message: "Το μηνιαίο κόστος είναι ποσό, π.χ. 20 ή 19,90.",
  })
  .transform(Number);

export const subscriptionInputSchema = z.object({
  provider: z
    .string()
    .trim()
    .min(1, { message: "Γράψε τον πάροχο." })
    .max(80, { message: "Πάροχος: έως 80 χαρακτήρες." }),
  covers: optionalText(200, "Τι καλύπτει"),
  plan: optionalText(80, "Πλάνο"),
  monthlyCost: money,
  currency: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => /^[A-Z]{3}$/.test(value), {
      message: "Το νόμισμα είναι κωδικός ISO τριών γραμμάτων, π.χ. EUR ή USD.",
    }),
  renewsOn: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: "Η ανανέωση είναι ημερομηνία.",
    })
    .transform((value) => (value === "" ? null : value)),
  account: optionalText(120, "Λογαριασμός"),
  paidBy: optionalText(120, "Ποιος πληρώνει"),
  link: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || (/^https:\/\/\S+$/.test(value) && value.length <= 500),
      {
        message: "Ο σύνδεσμος ξεκινά με https://.",
      },
    ),
});
export type SubscriptionInput = z.infer<typeof subscriptionInputSchema>;

export const subscriptionSchema = z.object({
  id: z.string(),
  provider: z.string(),
  covers: z.string(),
  plan: z.string(),
  monthlyCost: z.number(),
  currency: z.string(),
  renewsOn: z.string().nullable(),
  account: z.string(),
  paidBy: z.string(),
  link: z.string(),
  updatedAt: z.string(),
});
export type Subscription = z.infer<typeof subscriptionSchema>;

export const subscriptionsViewSchema = z.object({
  items: z.array(subscriptionSchema),
  totals: z.array(
    z.object({ currency: z.string(), total: z.number(), count: z.number() }),
  ),
});
export type SubscriptionsView = z.infer<typeof subscriptionsViewSchema>;

// Η εγγραφή για τη βάση (στήλες του πίνακα subscriptions).
export const toSubscriptionRow = (input: SubscriptionInput) => ({
  provider: input.provider,
  covers: input.covers,
  plan: input.plan,
  monthly_cost: input.monthlyCost,
  currency: input.currency,
  renews_on: input.renewsOn,
  account: input.account,
  paid_by: input.paidBy,
  link: input.link,
});
