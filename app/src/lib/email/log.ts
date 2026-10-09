import type { SupabaseClient } from "@supabase/supabase-js";

import type { SendOutcome } from "./send-email";

// Γράφει στο Ιστορικό αποστολών (email_log) μόνο θέμα και κατάσταση: ποτέ σύνδεσμος, token ή κωδικός.
export interface EmailLogEntry {
  kind: string;
  toEmail: string;
  subject: string;
  outcome: SendOutcome;
}

export async function recordEmailLog(admin: SupabaseClient | null, entry: EmailLogEntry): Promise<void> {
  if (!admin) {
    console.error("recordEmailLog", "λείπει το service role");
    return;
  }
  const { error } = await admin.rpc("email_log_record", {
    p_kind: entry.kind,
    p_to_email: entry.toEmail,
    p_subject: entry.subject,
    p_status: entry.outcome.status,
    p_provider_id: entry.outcome.providerId,
    p_error: entry.outcome.error,
  });
  if (error) console.error("email_log_record", error.message);
}
