import { z } from "zod";

import { AUDIT_ACTIONS } from "./url";

// Τα JSON των RPC του Ίχνους (audit_trail, audit_trail_options, audit_trail_export). Το «πριν» και το «μετά» μένουν
// άγνωστα: τα διαβάζει το changes.ts. Τα κρυφά πεδία έρχονται ήδη κρυμμένα από τη βάση. Ό,τι δεν ταιριάζει σπάει δυνατά.

const itemSchema = z.object({
  id: z.number(),
  at: z.string(),
  actorId: z.string().nullable(),
  actorName: z.string(),
  action: z.enum(AUDIT_ACTIONS),
  entity: z.string(),
  entityLabel: z.string(),
  area: z.string(),
  areaLabel: z.string(),
  parent: z.string().nullable(),
  entityId: z.string().nullable(),
  subject: z.string().nullable(),
  before: z.unknown(),
  after: z.unknown(),
  changed: z.array(z.string()).nullable(),
});

const pageSchema = z.object({
  items: z.array(itemSchema),
  hasMore: z.boolean(),
  subject: z
    .object({ label: z.string(), name: z.string().nullable() })
    .nullable(),
});

const optionsSchema = z.object({
  areas: z.array(z.object({ code: z.string(), label: z.string() })),
  entities: z.array(
    z.object({ code: z.string(), label: z.string(), area: z.string() }),
  ),
  actors: z.array(z.object({ id: z.string(), name: z.string() })),
});

const exportSchema = z.object({
  filters: z.record(z.string(), z.unknown()),
  rows: z.array(itemSchema),
  truncated: z.boolean(),
});

export type AuditItem = z.infer<typeof itemSchema>;
export type AuditPage = z.infer<typeof pageSchema>;
export type AuditOptions = z.infer<typeof optionsSchema>;
export type AuditExport = z.infer<typeof exportSchema>;

export const parseAuditPage = (data: unknown): AuditPage =>
  pageSchema.parse(data);
export const parseAuditOptions = (data: unknown): AuditOptions =>
  optionsSchema.parse(data);
export const parseAuditExport = (data: unknown): AuditExport =>
  exportSchema.parse(data);
