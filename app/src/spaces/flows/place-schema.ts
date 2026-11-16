// Το σχήμα μιας θέσης οδηγού στον λογαριασμό (today_flow_places): ίδιο για εγγραφή και ανάγνωση. Καθαρό αρχείο.

import { z } from "zod";

export const JOB = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);

export const placeSchema = z.object({
  job: JOB,
  step: z.number().int().min(1).max(20),
  reason: z.enum(["exit", "wait"]),
  at: z.number().int(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  filming: z
    .object({
      path: z.string().max(200),
      crew: z.number().int(),
      equipment: z.number().int(),
    })
    .optional(),
  item: z.string().min(1).max(200).optional(),
  href: z.string().max(500).regex(/^\/app(\/|\?|$)/).optional(),
});


// Η ανάγνωση (today_places): κάθε θέση με τη δουλειά της. null = άκυρη απάντηση.
export const parsePlaces = (data: unknown) => {
  const parsed = z.array(placeSchema).safeParse(data);
  return parsed.success ? parsed.data : null;
};
