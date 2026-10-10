import { createSupabase } from "@/lib/supabase/server";

import { missingWhenNotFound, read, type ReadResult } from "./read";
import {
  blockedTimeViewSchema,
  calendarViewSchema,
  linkStatusSchema,
} from "./view-schema";
import type { BlockedTime, CalendarData, CalendarLinkStatus } from "./types";

// Ανάγνωση του Ημερολογίου. Όλα περνούν από RPC· η βάση αποφασίζει τι βλέπει ο καθένας.

export async function getCalendarView(range: {
  from: string;
  to: string;
}): Promise<ReadResult<CalendarData>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getCalendarView",
    supabase.rpc("calendar_view", { p_from: range.from, p_to: range.to }),
    (data) => calendarViewSchema.parse(data),
  );
}

export async function getBlockedTime(
  id: string,
): Promise<ReadResult<BlockedTime | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getBlockedTime",
    missingWhenNotFound(supabase.rpc("blocked_time_view", { p_id: id })),
    (data) => blockedTimeViewSchema.parse(data),
  );
}

export async function getLinkStatus(): Promise<ReadResult<CalendarLinkStatus>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getLinkStatus", supabase.rpc("calendar_link_status"), (data) =>
    linkStatusSchema.parse(data),
  );
}
