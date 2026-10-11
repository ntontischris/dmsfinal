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
  readAt: z.string().nullable(),
  editMinutes: z.number(),
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

export type InboxItem = z.infer<typeof inboxItemSchema>;
export type Inbox = z.infer<typeof inboxSchema>;
export type ThreadMessage = z.infer<typeof messageSchema>;
export type Thread = z.infer<typeof threadSchema>;
export type ThreadProduction = z.infer<typeof productionOptionSchema>;
export type MentionItem = z.infer<typeof mentionItemSchema>;
export type WritableClient = z.infer<typeof idNameSchema>;

export const parseInbox = (data: unknown): Inbox => inboxSchema.parse(data);
export const parseThread = (data: unknown): Thread => threadSchema.parse(data);
export const parseMentions = (data: unknown): MentionItem[] => mentionsSchema.parse(data).items;
export const parseWritableClients = (data: unknown): WritableClient[] => z.array(idNameSchema).parse(data);
