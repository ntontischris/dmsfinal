import { z } from "zod";

// Σχήματα των JSON των RPC του Βοηθού (#192): assistant_conversations_list, assistant_conversation_get,
// assistant_unanswered_list. Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά.

export const CONVERSATION_AUDIENCES = ["public", "client", "team"] as const;
export const UNANSWERED_STATUSES = ["open", "covered", "ignored"] as const;
export const IGNORE_REASONS = ["off_topic", "personal_data", "abuse"] as const;
export const SOURCE_KINDS = ["item", "package", "sector"] as const;

export type ConversationAudience = (typeof CONVERSATION_AUDIENCES)[number];
export type UnansweredStatus = (typeof UNANSWERED_STATUSES)[number];
export type IgnoreReason = (typeof IGNORE_REASONS)[number];

const whoSchema = {
  who: z.string().nullable(),
  clientName: z.string().nullable(),
};

const conversationRowSchema = z.object({
  id: z.string(),
  audience: z.enum(CONVERSATION_AUDIENCES),
  language: z.string(),
  startedAt: z.string(),
  lastMessageAt: z.string(),
  firstQuestion: z.string().nullable(),
  messageCount: z.number(),
  questionCount: z.number(),
  noSourceCount: z.number(),
  ...whoSchema,
});

const conversationListSchema = z.object({
  counts: z.object({
    all: z.number(),
    public: z.number(),
    client: z.number(),
    team: z.number(),
  }),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  items: z.array(conversationRowSchema),
});

const sourceSchema = z.object({
  kind: z.enum(SOURCE_KINDS),
  id: z.string(),
  title: z.string(),
  gone: z.boolean(),
});

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  noSource: z.boolean(),
  createdAt: z.string(),
  sources: z.array(sourceSchema),
});

const conversationSchema = z.object({
  id: z.string(),
  audience: z.enum(CONVERSATION_AUDIENCES),
  language: z.string(),
  startedAt: z.string(),
  lastMessageAt: z.string(),
  messages: z.array(messageSchema),
  ...whoSchema,
});

const unansweredRowSchema = z.object({
  id: z.string(),
  question: z.string(),
  audience: z.enum(CONVERSATION_AUDIENCES),
  count: z.number(),
  firstAskedAt: z.string(),
  lastAskedAt: z.string(),
  status: z.enum(UNANSWERED_STATUSES),
  ignoreReason: z.enum(IGNORE_REASONS).nullable(),
  closedAt: z.string().nullable(),
  closedByName: z.string().nullable(),
  coveredItem: z
    .object({ id: z.string(), title: z.string(), status: z.string() })
    .nullable(),
  conversationIds: z.array(z.string()),
});

const unansweredListSchema = z.object({
  counts: z.object({
    open: z.number(),
    covered: z.number(),
    ignored: z.number(),
  }),
  items: z.array(unansweredRowSchema),
});

export type ConversationList = z.infer<typeof conversationListSchema>;
export type ConversationRow = z.infer<typeof conversationRowSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type ConversationMessage = z.infer<typeof messageSchema>;
export type MessageSource = z.infer<typeof sourceSchema>;
export type UnansweredList = z.infer<typeof unansweredListSchema>;
export type UnansweredRow = z.infer<typeof unansweredRowSchema>;

export const parseConversationList = (data: unknown): ConversationList =>
  conversationListSchema.parse(data);
export const parseConversation = (data: unknown): Conversation =>
  conversationSchema.parse(data);
export const parseUnansweredList = (data: unknown): UnansweredList =>
  unansweredListSchema.parse(data);
export const parseOpenCount = (data: unknown): number =>
  z.number().int().parse(data);
