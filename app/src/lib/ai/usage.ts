import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { costMicros, type AiAudience, type AiPurpose } from "./config";

// Κάθε κλήση AI γράφει το κόστος της στη βάση (ai_usage, μόνο service_role). Αποτυχία καταγραφής δεν σταματά τη δουλειά.

export interface AiUsage {
  purpose: AiPurpose;
  model: string;
  inputTokens: number;
  outputTokens?: number;
  audience: AiAudience;
}

export async function recordUsage(usage: AiUsage): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const outputTokens = usage.outputTokens ?? 0;
  const { error } = await admin.rpc("ai_usage_record", {
    p_purpose: usage.purpose,
    p_model: usage.model,
    p_input_tokens: usage.inputTokens,
    p_output_tokens: outputTokens,
    p_cost_micros: costMicros(usage.model, usage.inputTokens, outputTokens),
    p_audience: usage.audience,
  });
  if (error) console.error("ai_usage_record", error.message);
}
