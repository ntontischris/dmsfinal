import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type { ListUsage, SalesSettings } from "./types";

// Ανάγνωση Ρυθμίσεων › Πωλήσεις. Το πού πάνε οι νέες Ευκαιρίες το βλέπει κάθε μέλος της ομάδας (RLS)·
// οι μετρητές χρήσης δίνονται μόνο σε όποιον «Διαχειρίζεται Ρυθμίσεις».

const settingsSchema = z.object({
  form_routing: z.enum(["owner", "person", "queue"]),
  form_assignee_id: z.string().nullable(),
  updated_at: z.string(),
});

export async function getSalesSettings(): Promise<ReadResult<SalesSettings>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getSalesSettings",
    supabase
      .from("sales_settings")
      .select("form_routing, form_assignee_id, updated_at")
      .single(),
    (data) => {
      const row = settingsSchema.parse(data);
      return {
        formRouting: row.form_routing,
        formAssigneeId: row.form_assignee_id,
        updatedAt: row.updated_at,
      };
    },
  );
}

const usageSchema = z.array(
  z.object({ item_id: z.string(), uses: z.coerce.number() }),
);

// Πόσες φορές χρησιμοποιείται κάθε τιμή (το id της τιμής είναι μοναδικό σε όλες τις λίστες).
export async function listListUsage(): Promise<ReadResult<ListUsage>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("listListUsage", supabase.rpc("sales_list_usage"), (data) =>
    Object.fromEntries(
      usageSchema.parse(data).map((row) => [row.item_id, row.uses]),
    ),
  );
}
