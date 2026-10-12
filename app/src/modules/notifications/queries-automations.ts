import { createSupabase } from "@/lib/supabase/server";

import {
  parseCatalog,
  parseEventPage,
  parseHolidays,
  parsePrefs,
  parseSystemMessages,
  type Catalog,
  type EventPage,
  type Holidays,
  type Pref,
  type SystemMessage,
} from "./automation-view-schema";
import { read, type ReadResult } from "./read";

// Ανάγνωση της K1, της K2 και των Προτιμήσεων (#173). Όλα περνούν από RPC· null = ο θεατής δεν έχει Δικαίωμα.

export async function getCatalog(): Promise<ReadResult<Catalog | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getCatalog", supabase.rpc("automations_catalog"), parseCatalog);
}

// Ανύπαρκτο Γεγονός (P0001) = null, όπως και η άρνηση.
export async function getAutomationEvent(
  code: string,
): Promise<ReadResult<EventPage | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const result = await supabase.rpc("automation_event", { p_type: code });
  if (result.error?.code === "P0001") return { ok: true, data: null };
  return read("getAutomationEvent", Promise.resolve(result), parseEventPage);
}

export async function getHolidays(
  year: number,
): Promise<ReadResult<Holidays | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getHolidays",
    supabase.rpc("holiday_greetings_get", { p_year: year }),
    parseHolidays,
  );
}

export async function getSystemMessages(): Promise<
  ReadResult<SystemMessage[] | null>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getSystemMessages",
    supabase.rpc("system_messages_list"),
    parseSystemMessages,
  );
}

export async function getPrefs(): Promise<ReadResult<Pref[] | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getPrefs", supabase.rpc("my_notification_prefs"), parsePrefs);
}
