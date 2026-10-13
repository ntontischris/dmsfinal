import { z } from "zod";

// Η ροή μιας απάντησης του Βοηθού από τον server στο παράθυρο: μία γραμμή JSON ανά γεγονός (NDJSON).

export const sourceViewSchema = z.object({
  kind: z.enum(["item", "package"]),
  id: z.string(),
  title: z.string(),
  // Άρθρο/Αρχείο → /app/knowledge/<id>· Πακέτο → η σελίδα του στον Κατάλογο αν τη βλέπει ο Χρήστης, αλλιώς null.
  href: z.string().nullable(),
});
export type SourceView = z.infer<typeof sourceViewSchema>;

export const eventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("conversation"), id: z.string() }),
  z.object({ type: z.literal("text"), delta: z.string() }),
  z.object({ type: z.literal("done"), sources: z.array(sourceViewSchema) }),
  z.object({ type: z.literal("unknown"), text: z.string() }),
  z.object({
    type: z.literal("unavailable"),
    reason: z.enum(["unavailable", "capped"]),
  }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);
export type AssistantEvent = z.infer<typeof eventSchema>;

export const encodeEvent = (event: AssistantEvent): string =>
  `${JSON.stringify(event)}\n`;

// Μία γραμμή → γεγονός, ή null αν η γραμμή δεν είναι έγκυρη.
export function decodeEvent(line: string): AssistantEvent | null {
  if (line.trim() === "") return null;
  try {
    return eventSchema.safeParse(JSON.parse(line)).data ?? null;
  } catch {
    return null;
  }
}
