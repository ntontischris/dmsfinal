import { z } from "zod";

// Τα JSON του Ιστορικού αποστολών (#174): sends_list (K3) και client_sends (καρτέλα «Αποστολές» του Πελάτη).
// Χωρίς περιεχόμενο: η βάση δεν στέλνει ποτέ θέμα, σώμα, link ή token.

export const SEND_STATES = [
  "scheduled",
  "sent",
  "retrying",
  "failed",
  "not_sent",
] as const;

const baseSendSchema = z.object({
  id: z.string().min(1),
  at: z.string(),
  source: z.enum(["automation", "system"]),
  eventType: z.string().nullable(),
  eventLabel: z.string().nullable(),
  kind: z.string().nullable(),
  channel: z.enum(["notification", "email"]),
  recipientName: z.string().nullable(),
  state: z.enum(SEND_STATES),
});

export const sendSchema = baseSendSchema.extend({
  recipientEmail: z.string().nullable(),
  recipientCount: z.number().int().nullable(),
  clientId: z.uuid().nullable(),
  clientName: z.string().nullable(),
  attempts: z.number().int().nonnegative(),
  reason: z.string().nullable(),
  retryRef: z.uuid().nullable(),
  isRetried: z.boolean(),
});

export const sendsPageSchema = z.object({
  items: z.array(sendSchema),
  hasMore: z.boolean(),
  failed: z.number().int().nonnegative(),
  clients: z.array(z.object({ id: z.uuid(), name: z.string() })),
});

export const clientSendsPageSchema = z.object({
  items: z.array(baseSendSchema),
  hasMore: z.boolean(),
});

export type SendState = (typeof SEND_STATES)[number];
export type ClientSend = z.infer<typeof baseSendSchema>;
export type Send = z.infer<typeof sendSchema>;
export type SendsPage = z.infer<typeof sendsPageSchema>;
export type ClientSendsPage = z.infer<typeof clientSendsPageSchema>;

export const parseSendsPage = (data: unknown): SendsPage =>
  sendsPageSchema.parse(data);

export const parseClientSendsPage = (data: unknown): ClientSendsPage =>
  clientSendsPageSchema.parse(data);

// «Ξαναστείλε»: η γραμμή της ουράς που απέτυχε.
export const retrySchema = z.object({ ref: z.uuid() });
