import { z } from "zod";

import { QUESTION_MAX_CHARS } from "./limits";

// Το αίτημα του παραθύρου προς τον server του Βοηθού. Το uid ΔΕΝ έρχεται ποτέ από εδώ· το βρίσκει ο server (getUser).
export const requestSchema = z.object({
  conversationId: z.uuid().nullable().default(null),
  question: z
    .string()
    .trim()
    .min(1, "Γράψε μια ερώτηση.")
    .max(QUESTION_MAX_CHARS, "Η ερώτηση ξεπερνά τους 1.000 χαρακτήρες."),
});
export type AssistantRequest = z.infer<typeof requestSchema>;

// Το JSON του assistant_context (βλ. 20261017130000_assistant.sql).
const chunkSchema = z.object({
  itemId: z.string(),
  chunkId: z.string().nullable(),
  kind: z.enum(["article", "file"]),
  title: z.string(),
  sectionName: z.string(),
  content: z.string(),
  similarity: z.number().nullable(),
});

const packageSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameEn: z.string(),
  billing: z.enum(["monthly", "one_off"]),
  description: z.string(),
  descriptionEn: z.string(),
  price: z.number().nullable(),
  provisions: z.array(
    z.object({
      label: z.string(),
      labelEn: z.string(),
      unit: z.string(),
      unitEn: z.string(),
      quantity: z.number(),
    }),
  ),
  matched: z.boolean(),
  canOpen: z.boolean(),
});

export const contextSchema = z.object({
  chunks: z.array(chunkSchema),
  packages: z.array(packageSchema),
});
export type AssistantContext = z.infer<typeof contextSchema>;
export type ContextChunk = z.infer<typeof chunkSchema>;
export type ContextPackage = z.infer<typeof packageSchema>;
