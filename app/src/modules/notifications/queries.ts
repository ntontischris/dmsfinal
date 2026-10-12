import { createSupabase } from "@/lib/supabase/server";

import type { NotificationCursor, NotificationFilter } from "./helpers";
import { read, type ReadResult } from "./read";
import {
  parseBell,
  parseNotificationPage,
  type Bell,
  type NotificationPage,
} from "./view-schema";

// Ανάγνωση των Ειδοποιήσεων. Όλα περνούν από RPC· η βάση δείχνει μόνο τις δικές σου (και του τρέχοντος Πελάτη).
// null = ο θεατής δεν έχει Ειδοποιήσεις.

export const PAGE_SIZE = 20;

export async function getBell(): Promise<ReadResult<Bell | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getBell", supabase.rpc("notifications_bell"), parseBell);
}

export async function getNotifications(
  filter: NotificationFilter,
  cursor: NotificationCursor | null,
): Promise<ReadResult<NotificationPage | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getNotifications",
    supabase.rpc("notifications_list", {
      p_filter: filter,
      p_before: cursor?.at ?? null,
      p_before_id: cursor?.id ?? null,
      p_limit: PAGE_SIZE,
    }),
    parseNotificationPage,
  );
}
