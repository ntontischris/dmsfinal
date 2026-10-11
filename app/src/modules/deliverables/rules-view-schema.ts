import { z } from "zod";

// Το JSON της deliverable_settings_view. Οι προεπιλογές (defaults) δεν διαβάζονται εδώ: η οθόνη δεν τις δείχνει.
export const rulesViewSchema = z.object({
  internalReview: z.boolean(),
  changesDays: z.number().int(),
  reminderDays: z.array(z.number().int()),
  kinds: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      deadlineDays: z.number().int(),
      revisionLimit: z.number().int().nullable(),
    }),
  ),
});
