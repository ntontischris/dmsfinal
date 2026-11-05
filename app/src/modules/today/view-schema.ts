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
    // Χωρίς title ο renderer της κάρτας βρίσκει την ετικέτα από το id (π.χ. Ετοιμότητα).
    title: z.string().optional(),
    subtitle: z.string().nullable().optional(),
    at: z.string().nullable().optional(),
    urgent: z.boolean(),
    amount_cents: z.number().int().nullable().optional(),
    // Από πότε περιμένει η απόφαση (κάρτες απόφασης, #241 Σ7).
    waiting_since: z.string().nullable().optional(),
    // Μόνο κράτηση: η ώρα της χωρά ακόμα (Ωράριο και Χωρητικότητα).
    slot_free: z.boolean().nullable().optional(),
    link: appLink,
  })
  .transform(({ amount_cents, subtitle, at, title, waiting_since, slot_free, ...item }) => ({
    ...item,
    title: title ?? item.id,
    subtitle: subtitle ?? null,
    at: at ?? null,
    amountCents: amount_cents ?? null,
    waitingSince: waiting_since ?? null,
    isSlotFree: slot_free ?? null,
  }));

export const cardDataSchema = z.object({
  code: z.string(),
  count: z.number().int().nonnegative(),
  items: z.array(cardItemSchema),
});

// Χρήματα (#241 Σ4): public.today_money.
export const todayMoneySchema = z
  .object({
    overdue_cents: z.number().int().nonnegative(),
    overdue_count: z.number().int().nonnegative(),
    client_count: z.number().int().nonnegative(),
    debtors: z.array(
      z.object({
        client_id: z.string(),
        name: z.string(),
        amount_cents: z.number().int(),
        days: z.number().int(),
        link: appLink,
      }),
    ),
    month: z.object({
      month: z.number().int().min(1).max(12),
      day: z.number().int().min(1).max(31),
      days: z.number().int().min(28).max(31),
      collected_cents: z.number().int(),
      expected_cents: z.number().int(),
    }),
  })
  .transform(({ overdue_cents, overdue_count, client_count, debtors, month }) => ({
    overdueCents: overdue_cents,
    overdueCount: overdue_count,
    clientCount: client_count,
    debtors: debtors.map(({ client_id, amount_cents, ...debtor }) => ({
      ...debtor,
      id: client_id,
      amountCents: amount_cents,
    })),
    month: {
      month: month.month,
      day: month.day,
      days: month.days,
      collectedCents: month.collected_cents,
      expectedCents: month.expected_cents,
    },
  }));

// Η ομάδα (#241 Σ5): public.today_team. Μόνο όσοι κόλλησαν· οι υπόλοιποι ενεργοί στο fine.
export const todayTeamSchema = z
  .object({
    people: z.array(
      z.object({
        user_id: z.string(),
        name: z.string(),
        late: z.number().int().nonnegative(),
        oldest_days: z.number().int().nullable(),
        steps: z.number().int().nonnegative(),
        versions: z.number().int().nonnegative(),
      }),
    ),
    fine: z.number().int().nonnegative(),
  })
  .transform(({ people, fine }) => ({
    people: people.map(({ user_id, oldest_days, ...person }) => ({
      ...person,
      id: user_id,
      oldestDays: oldest_days,
    })),
    fine,
  }));

// Το πρόγραμμα μιας μέρας (#241 Σ3): public.today_programme.
export const todayProgrammeSchema = z.object({
  day: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      at: z.string(),
      subtitle: z.string().nullable(),
      crew: z.array(z.string()),
      link: appLink,
    }),
  ),
});

export type TodayCard = z.infer<typeof todayCardSchema>;
export type TodayCounts = z.output<typeof todayCountsSchema>;
export type CardItem = z.output<typeof cardItemSchema>;
export type CardData = z.output<typeof cardDataSchema>;
export type CardKind = (typeof CARD_KINDS)[number];
export type TodayMoney = z.output<typeof todayMoneySchema>;
export type TodayTeam = z.output<typeof todayTeamSchema>;
export type TeamPerson = TodayTeam["people"][number];
export type TodayProgramme = z.output<typeof todayProgrammeSchema>;

export const parseTodayCounts = (data: unknown): TodayCounts =>
  todayCountsSchema.parse(data);

export const parseCardData = (data: unknown): CardData =>
  cardDataSchema.parse(data);

export const parseTodayMoney = (data: unknown): TodayMoney =>
  todayMoneySchema.parse(data);

export const parseTodayTeam = (data: unknown): TodayTeam =>
  todayTeamSchema.parse(data);

export const parseTodayProgramme = (data: unknown): TodayProgramme =>
  todayProgrammeSchema.parse(data);
