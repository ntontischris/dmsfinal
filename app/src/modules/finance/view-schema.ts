import { z } from "zod";

// Σχήμα του JSON του billables_view («Προς τιμολόγηση»). Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά, και δεν φτάνει στην οθόνη.

const billableItemSchema = z.object({
  id: z.string(),
  billableOn: z.string(),
  agreementId: z.string(),
  agreementTitle: z.string(),
  reason: z.string(),
  label: z.string(),
  net: z.number(),
  open: z.number(),
  daysOpen: z.number(),
  reminders: z.array(z.number()),
});

const billableClientSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  open: z.number(),
  count: z.number(),
  oldestDays: z.number(),
  beyond: z.number(),
  items: z.array(billableItemSchema),
});

export const billablesViewSchema = z.object({
  total: z.number(),
  count: z.number(),
  clients: z.array(billableClientSchema),
});

export type BillableItem = z.infer<typeof billableItemSchema>;
export type BillableClient = z.infer<typeof billableClientSchema>;
export type BillablesView = z.infer<typeof billablesViewSchema>;

export const parseBillablesView = (data: unknown): BillablesView =>
  billablesViewSchema.parse(data);
