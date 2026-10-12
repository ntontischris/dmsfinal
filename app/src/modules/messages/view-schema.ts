import { z } from "zod";

// Σχήματα των JSON των RPC των Μηνυμάτων (messages_inbox, messages_thread, messages_mentions, messages_writable_clients).
// Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά. Το `null` σημαίνει «δεν δικαιούσαι να το δεις», ποτέ μηδέν.

const inboxItemSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  lastAt: z.string(),
  preview: z.string().nullable(),
  lastInternal: z.boolean(),
  lastDeleted: z.boolean(),
  unread: z.number(),
  partial: z.boolean(),
});

const inboxSchema = z.object({
  items: z.array(inboxItemSchema),
  mentionsUnread: z.number(),
});

const idNameSchema = z.object({ id: z.string(), name: z.string() });

const productionOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  state: z.string(),
});

export const MESSAGE_AUTHOR_KINDS = ["team", "client"] as const;

const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  mime: z.string(),
  size: z.number(),
});

export const REQUEST_KINDS = ["deliverable", "filming", "other"] as const;
export const REQUEST_STATES = ["open", "done", "rejected"] as const;
const resultKindSchema = z.enum(["deliverable", "filming"]);

// Το Αίτημα ενός Μηνύματος. Τα πεδία της ομάδας (υπεύθυνος, μέρες, δυνατότητες) λείπουν από την όψη πελάτη.
const requestSchema = z.object({
  kind: z.enum(REQUEST_KINDS),
  state: z.enum(REQUEST_STATES),
  declaredBy: z.enum(MESSAGE_AUTHOR_KINDS),
  declaredAt: z.string(),
  closedAt: z.string().nullable(),
  link: z.string().nullable(),
  comment: z.string().nullable(),
  reply: z.string().nullable(),
  automatic: z.boolean(),
  resultKind: resultKindSchema.nullable(),
  resultId: z.string().nullable(),
  assigneeId: z.string().nullable().optional(),
  assigneeName: z.string().nullable().optional(),
  daysOpen: z.number().nullable().optional(),
  stale: z.boolean().optional(),
  canHandle: z.boolean().optional(),
  canReassign: z.boolean().optional(),
});

// Αίτημα αλλαγής μετά την έγκριση (Μ12): μένει στο Παραδοτέο, φαίνεται και στη Συνομιλία.
const changeRequestSchema = z.object({
  id: z.string(),
  at: z.string(),
  deliverableId: z.string(),
  deliverableTitle: z.string(),
  body: z.string(),
  state: z.enum(["open", "done"]),
  decision: z.string().nullable(),
});

const messageSchema = z.object({
  id: z.string(),
  at: z.string(),
  authorId: z.string(),
  authorName: z.string().nullable(),
  authorKind: z.enum(MESSAGE_AUTHOR_KINDS),
  mine: z.boolean(),
  body: z.string().nullable(),
  productionId: z.string().nullable(),
  productionTitle: z.string().nullable(),
  // Λείπουν στην όψη πελάτη: ο πελάτης δεν βλέπει Εσωτερικά ούτε αναφορές.
  internal: z.boolean().optional(),
  mentions: z.array(idNameSchema).optional(),
  editedAt: z.string().nullable(),
  deleted: z.boolean(),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  attachments: z.array(attachmentSchema),
  request: requestSchema.nullable(),
});

const threadSchema = z.object({
  client: z.object({
    id: z.string(),
    name: z.string(),
    managerName: z.string().nullable(),
    status: z.string(),
  }),
  partial: z.boolean(),
  canWrite: z.boolean(),
  canWriteUntagged: z.boolean(),
  productions: z.array(productionOptionSchema),
  mentionable: z.array(idNameSchema).nullable(),
  assignable: z.array(idNameSchema).nullable(),
  readAt: z.string().nullable(),
  editMinutes: z.number(),
  changeRequests: z.array(changeRequestSchema),
  messages: z.array(messageSchema),
});

const mentionItemSchema = z.object({
  messageId: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  at: z.string(),
  body: z.string(),
  authorName: z.string().nullable(),
});

const mentionsSchema = z.object({ items: z.array(mentionItemSchema) });

const clientContextSchema = z.object({
  clientId: z.string(),
  canWrite: z.boolean(),
  editMinutes: z.number(),
  // null = κανένας ενεργός Αυτοματισμός email σύνοψης.
  digestMinutes: z.number().nullable(),
});

export type ClientContext = z.infer<typeof clientContextSchema>;
export const parseClientContext = (data: unknown): ClientContext =>
  clientContextSchema.parse(data);

// Η καρτέλα Αιτημάτων της ομάδας (J1). messageId null = αίτημα αλλαγής μετά την έγκριση (kind «change»).
const queueClosedSchema = z.object({
  at: z.string().nullable(),
  byName: z.string().nullable(),
  link: z.string().nullable(),
  comment: z.string().nullable(),
  reply: z.string().nullable(),
  automatic: z.boolean(),
  resultKind: resultKindSchema.nullable(),
  resultId: z.string().nullable(),
});

const queueItemSchema = z.object({
  messageId: z.string().nullable(),
  deliverableId: z.string().nullable(),
  clientId: z.string(),
  clientName: z.string(),
  productionTitle: z.string().nullable(),
  kind: z.enum([...REQUEST_KINDS, "change"]),
  state: z.enum(REQUEST_STATES),
  assigneeName: z.string().nullable(),
  daysOpen: z.number().nullable(),
  stale: z.boolean(),
  text: z.string(),
  at: z.string(),
  closed: queueClosedSchema.nullable(),
});

const requestsViewSchema = z.object({
  items: z.array(queueItemSchema),
  counts: z.object({ mine: z.number(), unassigned: z.number() }),
  solo: z.boolean(),
});

// Η καρτέλα Αιτημάτων του πελάτη (J3): χωρίς υπεύθυνο και μέρες.
const clientRequestSchema = z.object({
  messageId: z.string().nullable(),
  deliverableId: z.string().nullable(),
  deliverableTitle: z.string().nullable(),
  kind: z.enum([...REQUEST_KINDS, "change"]),
  state: z.enum(REQUEST_STATES),
  at: z.string(),
  text: z.string(),
  link: z.string().nullable(),
  comment: z.string().nullable(),
  reply: z.string().nullable(),
  automatic: z.boolean(),
  resultKind: resultKindSchema.nullable(),
  resultId: z.string().nullable(),
  decision: z.string().nullable(),
});

const clientRequestsSchema = z.object({
  items: z.array(clientRequestSchema),
  openCount: z.number(),
});

export type MessageRequest = z.infer<typeof requestSchema>;
export type RequestKind = (typeof REQUEST_KINDS)[number];
export type ChangeRequest = z.infer<typeof changeRequestSchema>;
export type QueueItem = z.infer<typeof queueItemSchema>;
export type RequestsView = z.infer<typeof requestsViewSchema>;
export type ClientRequest = z.infer<typeof clientRequestSchema>;
export type ClientRequests = z.infer<typeof clientRequestsSchema>;
export type InboxItem = z.infer<typeof inboxItemSchema>;
export type Inbox = z.infer<typeof inboxSchema>;
export type MessageAttachment = z.infer<typeof attachmentSchema>;
export type ThreadMessage = z.infer<typeof messageSchema>;
export type Thread = z.infer<typeof threadSchema>;
export type ThreadProduction = z.infer<typeof productionOptionSchema>;
export type MentionItem = z.infer<typeof mentionItemSchema>;
export type WritableClient = z.infer<typeof idNameSchema>;

export const parseInbox = (data: unknown): Inbox => inboxSchema.parse(data);
export const parseThread = (data: unknown): Thread => threadSchema.parse(data);
export const parseMentions = (data: unknown): MentionItem[] => mentionsSchema.parse(data).items;
export const parseWritableClients = (data: unknown): WritableClient[] => z.array(idNameSchema).parse(data);
export const parseRequestsView = (data: unknown): RequestsView => requestsViewSchema.parse(data);
export const parseClientRequests = (data: unknown): ClientRequests => clientRequestsSchema.parse(data);
