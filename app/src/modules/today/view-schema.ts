import { z } from "zod";

// Τα JSON των RPC της «Σήμερα» (#180). Η βάση γράφει snake_case· εδώ γίνονται camelCase.

// Οι σύνδεσμοι μιας κάρτας είναι πάντα εσωτερικές διαδρομές /app/….
const appLink = z.string().regex(/^\/app(?:[/?#]|$)/, "Μόνο εσωτερικές διαδρομές /app");

export const CARD_KINDS = ["action", "week", "health"] as const;
export const CARD_GROUPS = ["health", "decide", "work", "money", "knowledge", "week", "client"] as const;

export const todayCardSchema = z.object({
  code: z.string(),
  grp: z.enum(CARD_GROUPS),
  kind: z.enum(CARD_KINDS),
  label: z.string(),
  link: appLink,
  // null μόνο όταν η κάρτα απέτυχε να μετρήσει (failed).
  count: z.number().int().nonnegative().nullable(),
  failed: z.boolean(),
  hidden: z.boolean(),
});

export const todayCountsSchema = z
  .object({
    cards: z.array(todayCardSchema),
    unread_notifications: z.number().int().nonnegative(),
    customized: z.boolean(),
  })
  .transform(({ cards, unread_notifications, customized }) => ({
    cards,
    unreadNotifications: unread_notifications,
    isCustomized: customized,
  }));

export const cardItemSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    subtitle: z.string().nullable().optional(),
    at: z.string().nullable().optional(),
    urgent: z.boolean(),
    amount_cents: z.number().int().nullable().optional(),
    link: appLink,
  })
  .transform(({ amount_cents, subtitle, at, ...item }) => ({
    ...item,
    subtitle: subtitle ?? null,
    at: at ?? null,
    amountCents: amount_cents ?? null,
  }));

export const cardDataSchema = z.object({
  code: z.string(),
  count: z.number().int().nonnegative(),
  items: z.array(cardItemSchema),
});

export type TodayCard = z.infer<typeof todayCardSchema>;
export type TodayCounts = z.output<typeof todayCountsSchema>;
export type CardItem = z.output<typeof cardItemSchema>;
export type CardData = z.output<typeof cardDataSchema>;
export type CardKind = (typeof CARD_KINDS)[number];

export const parseTodayCounts = (data: unknown): TodayCounts =>
  todayCountsSchema.parse(data);

export const parseCardData = (data: unknown): CardData =>
  cardDataSchema.parse(data);
