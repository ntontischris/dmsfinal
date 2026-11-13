import { z } from "zod";

import type { ActualHours } from "./types";

// Οι πραγματικές ώρες ανά Πακέτο (b14), όπως τις δίνει η catalogue_item_actual_hours.
// Το null μένει null (καμία μέτρηση), δεν γίνεται 0.
const nullableNumber = z.union([z.null(), z.coerce.number()]);

const actualSchema = z.object({
  shoot: nullableNumber,
  shootCount: z.coerce.number(),
  edit: nullableNumber,
  editCount: z.coerce.number(),
});

export const parseActualHours = (data: unknown): ActualHours =>
  actualSchema.parse(data);

export const hasActualHours = (actual: ActualHours): boolean =>
  actual.shootCount > 0 || actual.editCount > 0;
