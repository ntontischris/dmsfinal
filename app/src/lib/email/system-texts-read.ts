import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { isSystemMessageCode, type SystemTextsMap } from "./system-texts";

// Τα κείμενα του admin για τα Μηνύματα συστήματος (K2, #173), με service role. Σφάλμα ανάγνωσης δεν σταματά ποτέ
// την αποστολή: φεύγει το κείμενο του κώδικα.

const rowSchema = z.object({
  code: z.string(),
  subject_el: z.string().nullable(),
  subject_en: z.string().nullable(),
  body_el: z.string().nullable(),
  body_en: z.string().nullable(),
});

export const toSystemTexts = (rows: unknown): SystemTextsMap => {
  const parsed = z.array(rowSchema).safeParse(rows);
  if (!parsed.success) return {};
  return Object.fromEntries(
    parsed.data
      .filter((row) => isSystemMessageCode(row.code))
      .map((row) => [
        row.code,
        {
          subjectEl: row.subject_el,
          subjectEn: row.subject_en,
          bodyEl: row.body_el,
          bodyEn: row.body_en,
        },
      ]),
  );
};

// null = δεν διαβάστηκε (δεν μπαίνει στην cache).
async function fetchSystemTexts(admin: SupabaseClient | null): Promise<SystemTextsMap | null> {
  if (!admin) return null;
  try {
    const { data, error } = await admin.from("system_messages").select("code, subject_el, subject_en, body_el, body_en");
    if (error) {
      console.error("readSystemTexts", error.message);
      return null;
    }
    return toSystemTexts(data);
  } catch (error) {
    console.error("readSystemTexts", error instanceof Error ? error.name : "άγνωστο σφάλμα");
    return null;
  }
}

export async function readSystemTexts(admin: SupabaseClient | null): Promise<SystemTextsMap> {
  return (await fetchSystemTexts(admin)) ?? {};
}

// Για το Send Email Hook (λήγει στα 5″): όπως το readReplyToQuick, cache 5′ και όριο χρόνου 1,5″.
export const SYSTEM_TEXTS_CACHE_MS = 5 * 60_000;
export const SYSTEM_TEXTS_TIMEOUT_MS = 1_500;

let cached: { value: SystemTextsMap; at: number } | null = null;

export function clearSystemTextsCache(): void {
  cached = null;
}

const timeout = (ms: number): Promise<null> =>
  new Promise((resolve) => setTimeout(() => resolve(null), ms));

export async function readSystemTextsQuick(
  admin: SupabaseClient | null,
  now: number = Date.now(),
  timeoutMs: number = SYSTEM_TEXTS_TIMEOUT_MS,
): Promise<SystemTextsMap> {
  if (cached && now - cached.at < SYSTEM_TEXTS_CACHE_MS) return cached.value;
  const value = await Promise.race([
    readSystemTexts(admin),
    timeout(timeoutMs),
  ]);
  if (value === null) return {};
  cached = { value, at: now };
  return value;
}
