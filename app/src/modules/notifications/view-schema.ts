import { z } from "zod";

// Τα JSON των RPC του καμπανακιού (#170). Τα ονόματα είναι camelCase όπως τα γράφει η βάση.

export const notificationItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string().nullable(),
  createdAt: z.string(),
  isRead: z.boolean(),
});

export const bellSchema = z.object({
  unread: z.number().int().nonnegative(),
  latest: z.array(notificationItemSchema),
});

export const notificationPageSchema = z.object({
  items: z.array(notificationItemSchema),
  hasMore: z.boolean(),
  unread: z.number().int().nonnegative(),
});

export type NotificationItem = z.infer<typeof notificationItemSchema>;
export type Bell = z.infer<typeof bellSchema>;
export type NotificationPage = z.infer<typeof notificationPageSchema>;

export const parseBell = (data: unknown): Bell => bellSchema.parse(data);

export const parseNotificationPage = (data: unknown): NotificationPage =>
  notificationPageSchema.parse(data);
