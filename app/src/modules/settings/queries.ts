import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

// Ανάγνωση Ρυθμίσεων › Εταιρεία και Ελέγχου ετοιμότητας. Τα φιλτράρει η βάση (RLS).

export type ReadResult<T> = { ok: true; data: T } | { ok: false };

const companySchema = z.object({
  legal_name: z.string(),
  trade_name: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  reply_to_email: z.string(),
  signatory_name: z.string(),
  signatory_title: z.string(),
  tax_id: z.string(),
  tax_office: z.string(),
  gemi: z.string(),
  vat_rate: z.coerce.number(),
  ai_monthly_cap_usd: z.coerce.number(),
  ai_widget_share: z.number(),
  widget_messages_per_conversation: z.number(),
  widget_messages_per_ip_day: z.number(),
  updated_at: z.string(),
});

export type CompanySettings = z.infer<typeof companySchema>;

const COMPANY_COLUMNS = Object.keys(companySchema.shape).join(", ");

const bankAccountSchema = z.object({
  id: z.string(),
  bank_name: z.string(),
  holder: z.string(),
  iban: z.string(),
  is_default: z.boolean(),
  retired_at: z.string().nullable(),
});

export type BankAccount = z.infer<typeof bankAccountSchema>;

const readinessSchema = z.array(
  z.object({
    item: z.string(),
    done: z.boolean(),
    note: z.string().nullable(),
  }),
);
export type ReadinessRow = z.infer<typeof readinessSchema>[number];

const changeSchema = z.object({
  at: z.string(),
  entity: z.string(),
  actor_id: z.string().nullable(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
});

export interface SettingsChange {
  at: string;
  entity: string;
  actorName: string;
  fields: readonly string[];
}

async function read<T>(
  label: string,
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  parse: (data: unknown) => T,
): Promise<ReadResult<T>> {
  const { data, error } = await query;
  if (error) {
    console.error(`${label}:`, error.message);
    return { ok: false };
  }
  return { ok: true, data: parse(data) };
}

export async function getCompany(): Promise<ReadResult<CompanySettings>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getCompany",
    supabase.from("company_settings").select(COMPANY_COLUMNS).single(),
    (data) => companySchema.parse(data),
  );
}

export async function listBankAccounts(): Promise<ReadResult<BankAccount[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listBankAccounts",
    supabase
      .from("bank_accounts")
      .select("id, bank_name, holder, iban, is_default, retired_at")
      .order("is_default", { ascending: false })
      .order("created_at"),
    (data) => z.array(bankAccountSchema).parse(data),
  );
}

export async function getReadiness(): Promise<ReadResult<ReadinessRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getReadiness", supabase.rpc("readiness"), (data) =>
    readinessSchema.parse(data),
  );
}

export async function getOpenedAt(): Promise<ReadResult<string | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getOpenedAt",
    supabase.from("system_state").select("opened_at").single(),
    (data) =>
      z.object({ opened_at: z.string().nullable() }).parse(data).opened_at,
  );
}

const changedFields = (
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): string[] =>
  Object.keys({ ...before, ...after }).filter(
    (key) =>
      !["updated_at", "updated_by"].includes(key) &&
      JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]),
  );

// Οι 3 τελευταίες αλλαγές της καρτέλας, από το Ίχνος. Χωρίς «Βλέπει ίχνος ενεργειών» η βάση δεν επιστρέφει τίποτα.
export async function recentChanges(
  entities: readonly string[],
): Promise<ReadResult<SettingsChange[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const changes = await read(
    "recentChanges",
    supabase
      .from("audit_log")
      .select("at, entity, actor_id, before, after")
      .in("entity", [...entities])
      .order("at", { ascending: false })
      .limit(3),
    (data) => z.array(changeSchema).parse(data),
  );
  if (!changes.ok) return changes;
  const actorIds = [
    ...new Set(changes.data.flatMap((c) => (c.actor_id ? [c.actor_id] : []))),
  ];
  const { data: people } = actorIds.length
    ? await supabase
        .from("team_users")
        .select("user_id, name")
        .in("user_id", actorIds)
    : { data: [] };
  const nameOf = (id: string | null) =>
    (people ?? []).find((p: { user_id: string }) => p.user_id === id)?.name ??
    "το σύστημα";
  return {
    ok: true,
    data: changes.data.map((c) => ({
      at: c.at,
      entity: c.entity,
      actorName: nameOf(c.actor_id),
      fields: changedFields(c.before, c.after),
    })),
  };
}
