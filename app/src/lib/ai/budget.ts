import "server-only";

import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";

import { aiConfigured, type AiUse } from "./available";
import type { AiAudience } from "./config";

// Το πλαφόν δαπάνης AI (Γ3): ο server ρωτά τη βάση (ai_budget, μόνο service_role) πριν από κάθε κλήση που σταματά στο πλαφόν
// (Βοηθός, αναζήτηση A8). Χρήστες: ανοιχτό κάτω από το 100%· δημόσιο widget: κάτω από το μερίδιο. Τα embeddings του worker
// ΔΕΝ ρωτούν εδώ (μετρούν, αλλά δεν σταματούν).

const budgetSchema = z.object({
  month: z.string(),
  spentMicros: z.number(),
  capMicros: z.number(),
  publicShare: z.number(),
  publicLimitMicros: z.number(),
  usersOpen: z.boolean(),
  publicOpen: z.boolean(),
});
export type AiBudget = z.infer<typeof budgetSchema>;

// ok · unavailable (λείπει το κλειδί του παρόχου, ή η βάση δεν απάντησε) · capped (πλαφόν, ως την 1η του μήνα)
export type AiState = "ok" | "unavailable" | "capped";

export const budgetAllows = (
  budget: AiBudget,
  audience: AiAudience,
): boolean => (audience === "public" ? budget.publicOpen : budget.usersOpen);

async function readAiBudget(): Promise<AiBudget | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data, error } = await admin.rpc("ai_budget", {});
  if (error) {
    console.error("ai_budget", error.message);
    return null;
  }
  return budgetSchema.safeParse(data).data ?? null;
}

export async function aiState(
  audience: AiAudience,
  uses: readonly AiUse[],
): Promise<AiState> {
  if (!uses.every(aiConfigured)) return "unavailable";
  const budget = await readAiBudget();
  if (!budget) return "unavailable";
  return budgetAllows(budget, audience) ? "ok" : "capped";
}

export const aiAvailable = async (
  audience: AiAudience,
  uses: readonly AiUse[],
): Promise<boolean> => (await aiState(audience, uses)) === "ok";
