import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// Το «Email απαντήσεων» των Ρυθμίσεων (company_settings.reply_to_email) μπαίνει ως reply-to σε κάθε email (#171, Α8).
// Κενό ή μη έγκυρο → χωρίς reply-to. Σφάλμα ανάγνωσης δεν σταματά ποτέ την αποστολή.

const replyToSchema = z.email().max(320);

export const toReplyTo = (value: unknown): string | undefined => {
  const parsed = replyToSchema.safeParse(
    typeof value === "string" ? value.trim() : "",
  );
  return parsed.success ? parsed.data : undefined;
};

export async function readReplyTo(
  admin: SupabaseClient | null,
): Promise<string | undefined> {
  if (!admin) return undefined;
  try {
    const { data, error } = await admin
      .from("company_settings")
      .select("reply_to_email")
      .eq("id", true)
      .maybeSingle();
    if (error) {
      console.error("readReplyTo", error.message);
      return undefined;
    }
    return toReplyTo(data?.reply_to_email);
  } catch (error) {
    console.error("readReplyTo", error instanceof Error ? error.name : "άγνωστο σφάλμα");
    return undefined;
  }
}

// Για το Send Email Hook (λήγει στα 5″): μικρή cache στη μνήμη (5′) και όριο χρόνου (1,5″) στην ανάγνωση.
// Σε αποτυχία ή αργή απάντηση το email φεύγει χωρίς reply-to.
export const REPLY_TO_CACHE_MS = 5 * 60_000;
export const REPLY_TO_TIMEOUT_MS = 1_500;

let cached: { value: string | undefined; at: number } | null = null;

export function clearReplyToCache(): void {
  cached = null;
}

const timeout = (ms: number): Promise<undefined> =>
  new Promise((resolve) => setTimeout(() => resolve(undefined), ms));

export async function readReplyToQuick(
  admin: SupabaseClient | null,
  now: number = Date.now(),
  timeoutMs: number = REPLY_TO_TIMEOUT_MS,
): Promise<string | undefined> {
  if (cached && now - cached.at < REPLY_TO_CACHE_MS) return cached.value;
  const value = await Promise.race([readReplyTo(admin), timeout(timeoutMs)]);
  if (value !== undefined) cached = { value, at: now };
  return value;
}
