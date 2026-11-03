import { z } from "zod";

import { documentSchema } from "./view-schema";

// Η όψη του Χρήστη πελάτη (client_agreements_view, client_agreement_view). Η βάση στέλνει μόνο ό,τι βλέπει ο πελάτης:
// ποτέ κόστος, ώρες, Παρεκκλίσεις, Εγκρίσεις ή παραλήπτες. Το έγγραφο έχει το σχήμα του Συνδέσμου (D5).

const clientProvisionSchema = z.object({
  kindId: z.string(),
  label: z.string(),
  unit: z.string(),
  given: z.number(),
  carried: z.number(),
  used: z.number(),
  reserved: z.number(),
  balance: z.number(),
});

const clientPeriodSchema = z.object({
  n: z.number().int(),
  starts: z.string(),
  ends: z.string(),
  isPartial: z.boolean(),
  state: z.enum(["closed", "current", "next"]),
  amount: z.number().nullable(),
  provisions: z.array(clientProvisionSchema),
});

const clientCardFields = {
  id: z.string(),
  title: z.string(),
  kind: z.enum(["monthly", "one_off"]),
  language: z.enum(["el", "en"]),
  state: z.enum(["proposal", "signed", "active", "expired", "dissolved"]),
  sentAt: z.string().nullable(),
  validUntil: z.string().nullable(),
  startOn: z.string().nullable(),
  endOn: z.string().nullable(),
  durationMonths: z.number().int().nullable(),
  signedAt: z.string().nullable(),
  net: z.number().nullable(),
};

const clientCardSchema = z.object({
  ...clientCardFields,
  current: clientPeriodSchema.nullable(),
});

export const clientAgreementsSchema = z
  .object({ items: z.array(clientCardSchema) })
  .transform((view) => view.items);

export const clientAgreementSchema = z
  .object({
    ...clientCardFields,
    document: documentSchema.nullable(),
    periods: z.array(clientPeriodSchema),
    signature: z
      .object({ signedName: z.string(), signedOn: z.string() })
      .nullable(),
  })
  .nullable();

export type ClientProvision = z.infer<typeof clientProvisionSchema>;
export type ClientPeriod = z.infer<typeof clientPeriodSchema>;
export type ClientAgreementCard = z.infer<typeof clientCardSchema>;
export type ClientAgreement = NonNullable<
  z.output<typeof clientAgreementSchema>
>;
