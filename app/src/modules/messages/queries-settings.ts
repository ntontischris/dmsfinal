import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import {
  messageSettingsViewSchema,
  type MessageSettings,
} from "./settings-schemas";

// Οι Ρυθμίσεις Μηνυμάτων για τη σελίδα Ρυθμίσεων. Η βάση κρίνει το Δικαίωμα.
export async function getMessageSettings(): Promise<
  ReadResult<MessageSettings>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getMessageSettings",
    supabase.rpc("message_settings_get"),
    (data) => messageSettingsViewSchema.parse(data),
  );
}
