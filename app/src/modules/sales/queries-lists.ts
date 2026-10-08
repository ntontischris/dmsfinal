import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type { ActivityLookups, ListItem, SalesLists } from "./types";

// Οι λίστες του admin (Στάδια, Πηγές, Λόγοι απώλειας, Είδη Δραστηριότητας), μαζί με τις αποσυρμένες:
// η οθόνη φιλτράρει με `isRetired` ό,τι δεν πρέπει να επιλέγεται πια.

const LIST_COLUMNS = "id, code, label, sort, is_system, retired_at";

const listRowsSchema = z.array(
  z.object({
    id: z.string(),
    code: z.string().nullable(),
    label: z.string(),
    sort: z.number(),
    is_system: z.boolean(),
    retired_at: z.string().nullable(),
  }),
);

const parseList = (data: unknown): ListItem[] =>
  listRowsSchema.parse(data).map((row) => ({
    id: row.id,
    code: row.code,
    label: row.label,
    sort: row.sort,
    isSystem: row.is_system,
    isRetired: row.retired_at !== null,
  }));

type Supabase = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;

const readList = (supabase: Supabase, table: string) =>
  read(
    `list.${table}`,
    supabase.from(table).select(LIST_COLUMNS).order("sort").order("id"),
    parseList,
  );

export async function listSalesLists(): Promise<ReadResult<SalesLists>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const [stages, sources, lossReasons, activityKinds] = await Promise.all([
    readList(supabase, "sales_stages"),
    readList(supabase, "sales_sources"),
    readList(supabase, "sales_loss_reasons"),
    readList(supabase, "sales_activity_kinds"),
  ]);
  if (!stages.ok || !sources.ok || !lossReasons.ok || !activityKinds.ok)
    return { ok: false };
  return {
    ok: true,
    data: {
      stages: stages.data,
      sources: sources.data,
      lossReasons: lossReasons.data,
      activityKinds: activityKinds.data,
    },
  };
}

const toNames = (items: readonly ListItem[]): Record<string, string> =>
  Object.fromEntries(items.map((item) => [item.id, item.label]));

const usersSchema = z.array(
  z.object({ user_id: z.string(), name: z.string() }),
);

// Id → όνομα για να γραφτούν οι αυτόματες Δραστηριότητες· περιλαμβάνει και τις αποσυρμένες τιμές (το ιστορικό τις θυμάται).
export async function getActivityLookups(): Promise<
  ReadResult<ActivityLookups>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const [lists, users] = await Promise.all([
    listSalesLists(),
    read(
      "getActivityLookups.users",
      supabase.from("team_users").select("user_id, name"),
      (data) => usersSchema.parse(data),
    ),
  ]);
  if (!lists.ok || !users.ok) return { ok: false };
  return {
    ok: true,
    data: {
      stages: toNames(lists.data.stages),
      kinds: toNames(lists.data.activityKinds),
      lossReasons: toNames(lists.data.lossReasons),
      users: Object.fromEntries(
        users.data.map((user) => [user.user_id, user.name]),
      ),
    },
  };
}
