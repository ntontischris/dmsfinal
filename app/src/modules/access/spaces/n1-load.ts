import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import type { ReadResult } from "../queries";

// «Μέλος από» και «Τελευταία είσοδος» των Χρηστών ομάδας (public.team_last_sign_in, μόνο με access.team).
export interface TeamUserDates {
  since: string;
  lastSeen: string | null;
}

const rowSchema = z.object({
  userId: z.string(),
  createdAt: z.string(),
  lastSignInAt: z.string().nullable(),
});

export async function listTeamUserDates(): Promise<
  ReadResult<ReadonlyMap<string, TeamUserDates>>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("team_last_sign_in");
  if (error) {
    console.error("team_last_sign_in:", error.message);
    return { ok: false };
  }
  const parsed = z.array(rowSchema).safeParse(data);
  if (!parsed.success) return { ok: false };
  return {
    ok: true,
    data: new Map(
      parsed.data.map((row) => [
        row.userId,
        { since: row.createdAt, lastSeen: row.lastSignInAt },
      ]),
    ),
  };
}
