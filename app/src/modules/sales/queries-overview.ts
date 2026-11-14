import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { collectChunks } from "./paging";
import { read, type ReadResult } from "./read";
import type { ClientOverview, ClientProvision } from "./types";

// Πλούσια λίστα Πελατών (B1): μία κλήση για όλη τη σελίδα (έως 100 Πελάτες). Η βάση δίνει γραμμή μόνο για Πελάτη που
// ανοίγεις, και null σε ό,τι δεν δικαιούσαι να δεις (Συμφωνίες, Οικονομικά, Ευκαιρίες).

const provisionSchema = z.object({
  kind_id: z.string(),
  unit: z.string(),
  is_shoot: z.boolean(),
  given: z.number(),
  carried: z.number(),
  used: z.number(),
  reserved: z.number(),
});

const overviewSchema = z.array(
  z.object({
    client_id: z.string(),
    status: z.enum(["candidate", "active", "inactive"]),
    active_agreements: z.number().nullable(),
    package_name: z.string().nullable(),
    provisions: z.array(provisionSchema),
    next_filming: z.string().nullable(),
    balance_cents: z.number().nullable(),
    last_contact: z.string().nullable(),
  }),
);

const toProvision = (
  row: z.infer<typeof provisionSchema>,
): ClientProvision => ({
  kindId: row.kind_id,
  unit: row.unit,
  isShoot: row.is_shoot,
  given: row.given,
  carried: row.carried,
  used: row.used,
  reserved: row.reserved,
});

export const parseClientOverviews = (data: unknown): ClientOverview[] =>
  overviewSchema.parse(data).map((row) => ({
    clientId: row.client_id,
    status: row.status,
    activeAgreements: row.active_agreements,
    packageName: row.package_name,
    provisions: row.provisions.map(toProvision),
    nextFilming: row.next_filming,
    balanceCents: row.balance_cents,
    lastContact: row.last_contact,
  }));

export async function listClientOverviews(
  ids: readonly string[],
): Promise<ReadResult<ClientOverview[]>> {
  if (ids.length === 0) return { ok: true, data: [] };
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listClientOverviews",
    supabase.rpc("sales_client_overview", { p_ids: [...ids] }),
    parseClientOverviews,
  );
}

// Μόνο η τελευταία επαφή ανά Πελάτη (Pipeline): ίδιοι κανόνες με το last_contact της πλήρους εικόνας, χωρίς το κόστος της.
const lastContactsSchema = z.array(
  z.object({ client_id: z.string(), last_contact: z.string().nullable() }),
);

export const parseLastContacts = (
  data: unknown,
): Record<string, string | null> =>
  Object.fromEntries(
    lastContactsSchema
      .parse(data)
      .map((row) => [row.client_id, row.last_contact]),
  );

export async function listClientLastContacts(
  ids: readonly string[],
): Promise<ReadResult<Record<string, string | null>>> {
  if (ids.length === 0) return { ok: true, data: {} };
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listClientLastContacts",
    supabase.rpc("sales_client_last_contacts", { p_ids: [...ids] }),
    parseLastContacts,
  );
}

// Η εικόνα πολλών Πελατών (B1), σε κομμάτια των 100.
export const listAllClientOverviews = (
  ids: readonly string[],
): Promise<ReadResult<ClientOverview[]>> =>
  collectChunks(ids, listClientOverviews);
