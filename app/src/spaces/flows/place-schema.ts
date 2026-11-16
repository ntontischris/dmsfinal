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


// Η ανάγνωση (today_places): κάθε θέση με τη δουλειά της· μια άκυρη θέση πέφτει μόνη της. null = δεν ήρθε πίνακας.
export const parsePlaces = (data: unknown) => {
  const list = z.array(z.unknown()).safeParse(data);
  if (!list.success) return null;
  return list.data.flatMap((item) => {
    const place = placeSchema.safeParse(item);
    return place.success ? [place.data] : [];
  });
};
