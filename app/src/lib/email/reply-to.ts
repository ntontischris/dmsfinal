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
