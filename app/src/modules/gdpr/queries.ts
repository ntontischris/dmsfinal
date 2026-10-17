import type { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import {
  registerSchema,
  subjectsSchema,
  type GdprRegister,
  type GdprSubjects,
} from "./schemas";

// Ανάγνωση του μητρώου και των υποκειμένων. Μόνο ο Ιδιοκτήτης παίρνει απάντηση· στους άλλους η βάση αρνείται (42501).

export type ReadResult<T> = { ok: true; data: T } | { ok: false };

async function readRpc<T>(
  name: string,
  schema: z.ZodType<T>,
): Promise<ReadResult<T>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc(name);
  if (error) {
    console.error(`${name}:`, error.message);
    return { ok: false };
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success)
    console.error(`${name}: απρόσμενη μορφή`, parsed.error.message);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false };
}

export const getGdprRegister = (): Promise<ReadResult<GdprRegister>> =>
  readRpc("gdpr_register", registerSchema);

export const getGdprSubjects = (): Promise<ReadResult<GdprSubjects>> =>
  readRpc("gdpr_subjects", subjectsSchema);
