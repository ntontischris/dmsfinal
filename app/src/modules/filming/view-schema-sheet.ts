import { z } from "zod";

import type { SheetView } from "./sheet-types";

// Σχήμα του JSON του filming_sheet_view (και του στιγμιοτύπου της τελευταίας έκδοσης). Ό,τι δεν ταιριάζει σπάει εδώ.

const shotSchema = z.object({ id: z.string(), text: z.string() });

const snapshotSchema = z.object({
  startsAt: z.string(),
  hours: z.number(),
  location: z.string().nullable(),
  production: z.string(),
  client: z.string().nullable(),
  crew: z.array(z.object({ userId: z.string(), name: z.string() })),
  equipment: z.array(z.object({ name: z.string() })),
  shots: z.array(shotSchema),
  crewNote: z.string().nullable(),
});

const currentSchema = z.object({
  version: z.number().int(),
  issuedAt: z.string(),
  issuedBy: z.string().nullable(),
  change: z.string().nullable(),
});

const versionSchema = z.object({
  version: z.number().int(),
  issuedAt: z.string(),
  issuedByName: z.string().nullable(),
  change: z.string().nullable(),
});

export const sheetViewSchema: z.ZodType<SheetView> = z.object({
  shots: z.array(shotSchema),
  crewNote: z.string().nullable(),
  current: currentSchema.nullable(),
  versions: z.array(versionSchema),
  hasChanges: z.boolean(),
  canEdit: z.boolean(),
  canIssue: z.boolean(),
  latest: snapshotSchema.nullable(),
});

export const sheetSummarySchema = z
  .object({ version: z.number().int(), hasChanges: z.boolean() })
  .nullable();
