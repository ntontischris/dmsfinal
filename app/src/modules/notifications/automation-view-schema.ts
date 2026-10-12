import { z } from "zod";

// Τα JSON των RPC της K1/K2 και των Προτιμήσεων (#173). camelCase όπως τα γράφει η βάση.

export const EVENT_KINDS = ["instant", "dated", "waiting"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

const eventTypeSchema = z.object({
  code: z.string(),
  number: z.number().int(),
  group: z.string(),
  kind: z.enum(EVENT_KINDS),
  label: z.string(),
  labelEn: z.string(),
  caseOf: z.string(),
  variables: z.array(z.string()),
  relatives: z.array(z.string()),
  hasVisitor: z.boolean(),
  isCostOnly: z.boolean(),
  isClientFacing: z.boolean(),
  isWired: z.boolean(),
});

export const catalogSchema = z.object({
  groups: z.array(z.object({ code: z.string(), label: z.string() })),
  events: z.array(
    eventTypeSchema.extend({
      activeCount: z.number().int(),
      totalCount: z.number().int(),
    }),
  ),
});

export const automationSchema = z.object({
  id: z.uuid(),
  eventType: z.string(),
  channel: z.enum(["notification", "email"]),
  recipientKind: z.enum(["relative", "permission", "users", "visitor"]),
  recipientRelative: z.string().nullable(),
  recipientPermission: z.string().nullable(),
  recipientUserIds: z.array(z.string()),
  timing: z.enum(["immediate", "offset", "wait"]),
  offsetDays: z.number().int().nullable(),
  sendTime: z.string().nullable(),
  waitMinutes: z.number().int().nullable(),
  subjectEl: z.string().nullable(),
  subjectEn: z.string().nullable(),
  bodyEl: z.string(),
  bodyEn: z.string(),
  isEssential: z.boolean(),
  isEnabled: z.boolean(),
  isInitial: z.boolean(),
});

export const eventPageSchema = z.object({
  event: eventTypeSchema,
  automations: z.array(automationSchema),
  teamUsers: z.array(
    z.object({ id: z.string(), name: z.string(), isActive: z.boolean() }),
  ),
  permissions: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
      kind: z.enum(["team", "client"]),
    }),
  ),
});

export const systemMessageSchema = z.object({
  code: z.string(),
  subjectEl: z.string().nullable(),
  subjectEn: z.string().nullable(),
  bodyEl: z.string().nullable(),
  bodyEn: z.string().nullable(),
  isEdited: z.boolean(),
  updatedAt: z.string(),
  updatedBy: z.string().nullable(),
  variables: z.array(z.string()),
  required: z.array(z.string()),
});

export const prefSchema = z.object({
  automationId: z.uuid(),
  eventType: z.string(),
  eventLabel: z.string(),
  channel: z.enum(["notification", "email"]),
  isEssential: z.boolean(),
  canMute: z.boolean(),
  receive: z.boolean(),
});

export const holidaysSchema = z.object({
  year: z.number().int(),
  holidays: z.array(
    z.object({
      date: z.string(),
      name: z.string(),
      isOfficial: z.boolean(),
      isOn: z.boolean(),
    }),
  ),
  added: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      onDate: z.string().nullable(),
      month: z.number().int().nullable(),
      day: z.number().int().nullable(),
    }),
  ),
  removed: z.array(z.string()),
});

export type EventType = z.infer<typeof eventTypeSchema>;
export type Catalog = z.infer<typeof catalogSchema>;
export type CatalogEvent = Catalog["events"][number];
export type Automation = z.infer<typeof automationSchema>;
export type EventPage = z.infer<typeof eventPageSchema>;
export type TeamUserOption = EventPage["teamUsers"][number];
export type PermissionOption = EventPage["permissions"][number];
export type SystemMessage = z.infer<typeof systemMessageSchema>;
export type Pref = z.infer<typeof prefSchema>;
export type Holidays = z.infer<typeof holidaysSchema>;
export type AddedHoliday = Holidays["added"][number];

export const parseCatalog = (data: unknown): Catalog =>
  catalogSchema.parse(data);
export const parseEventPage = (data: unknown): EventPage =>
  eventPageSchema.parse(data);
export const parseSystemMessages = (data: unknown): SystemMessage[] =>
  z.array(systemMessageSchema).parse(data);
export const parsePrefs = (data: unknown): Pref[] =>
  z.array(prefSchema).parse(data);
export const parseHolidays = (data: unknown): Holidays =>
  holidaysSchema.parse(data);
