import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import {
  ACTIVITY_COLUMNS,
  OPPORTUNITY_COLUMNS,
  parseActivities,
  parseOpportunities,
} from "./queries-opportunities";
import { read, type ReadResult } from "./read";
import type {
  ActivityRow,
  ClientDetail,
  ClientRow,
  Opportunity,
} from "./types";

// Ανάγνωση Πελατών. Η λίστα και η κάρτα περνούν από το RPC (δείχνει και τους «κατειλημμένους»)·
// η πλήρης καρτέλα από τον πίνακα, όπου η RLS κρύβει ό,τι δεν σε αφορά.

const DEFAULT_LIMIT = 100;

const clientRowSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    city: z.string(),
    manager_id: z.string().nullable(),
    manager_name: z.string().nullable(),
    can_open: z.boolean(),
    open_opportunities: z.number().nullable(),
    is_possible_duplicate: z.boolean(),
  }),
);

const parseClientRows = (data: unknown): ClientRow[] =>
  clientRowSchema.parse(data).map((row) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    managerId: row.manager_id,
    managerName: row.manager_name,
    canOpen: row.can_open,
    openOpportunities: row.open_opportunities,
    isPossibleDuplicate: row.is_possible_duplicate,
  }));

const clientDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  legal_name: z.string(),
  city: z.string(),
  afm: z.string().nullable(),
  contact_name: z.string(),
  contact_email: z.string(),
  contact_phone: z.string(),
  manager_id: z.string().nullable(),
  archived_at: z.string().nullable(),
  merged_into_id: z.string().nullable(),
  created_at: z.string(),
  manager: z.object({ name: z.string() }).nullable(),
});

const CLIENT_COLUMNS =
  "id, name, legal_name, city, afm, contact_name, contact_email, contact_phone, manager_id, archived_at, merged_into_id, created_at, manager:team_users!clients_manager_id_fkey(name)";

export async function listClients(
  options: { query?: string; limit?: number; offset?: number } = {},
): Promise<ReadResult<ClientRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listClients",
    supabase.rpc("sales_client_list", {
      p_query: options.query?.trim() || null,
      p_limit: options.limit ?? DEFAULT_LIMIT,
      p_offset: options.offset ?? 0,
      p_client: null,
    }),
    parseClientRows,
  );
}

export async function getClientCard(
  clientId: string,
): Promise<ReadResult<ClientRow | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getClientCard",
    supabase.rpc("sales_client_list", {
      p_query: null,
      p_limit: 1,
      p_offset: 0,
      p_client: clientId,
    }),
    (data) => parseClientRows(data)[0] ?? null,
  );
}

export async function getClient(
  clientId: string,
): Promise<ReadResult<ClientDetail | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getClient",
    supabase
      .from("clients")
      .select(CLIENT_COLUMNS)
      .eq("id", clientId)
      .maybeSingle(),
    (data) => {
      if (data === null) return null;
      const row = clientDetailSchema.parse(data);
      return {
        id: row.id,
        name: row.name,
        legalName: row.legal_name,
        city: row.city,
        afm: row.afm,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        managerId: row.manager_id,
        managerName: row.manager?.name ?? null,
        archivedAt: row.archived_at,
        mergedIntoId: row.merged_into_id,
        createdAt: row.created_at,
      };
    },
  );
}

export async function listClientOpportunities(
  clientId: string,
): Promise<ReadResult<Opportunity[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listClientOpportunities",
    supabase
      .from("opportunities")
      .select(OPPORTUNITY_COLUMNS)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    parseOpportunities,
  );
}

export async function listClientActivities(
  clientId: string,
  limit = 50,
): Promise<ReadResult<ActivityRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listClientActivities",
    supabase
      .from("opportunity_activities")
      .select(ACTIVITY_COLUMNS)
      .eq("client_id", clientId)
      .order("occurred_at", { ascending: false })
      .limit(limit),
    parseActivities,
  );
}
