"use server";

import { z } from "zod";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

import {
  UNCONFIGURED,
  callRpc,
  finishWith,
  firstIssue,
  messageOf,
  pick,
  refreshSales,
} from "./action-support";
import { nextSort, parseRoutingValue } from "./helpers";
import {
  LIST_TABLES,
  createListItemSchema,
  listItemRefSchema,
  moveListItemSchema,
  renameListItemSchema,
  retireStageSchema,
  routingSchema,
} from "./settings-schemas";
import type { ListName } from "./types";

// Ενέργειες Ρυθμίσεων › Πωλήσεις (O2). Οι λίστες γράφονται απευθείας με RLS («Διαχειρίζεται Ρυθμίσεις»)·
// τους κανόνες (χρησιμοποιημένο δεν διαγράφεται, ανοιχτό Στάδιο δεν αποσύρεται) τους επιβάλλει η βάση.

const SAVED_NOTICE =
  "Αποθηκεύτηκε. Ισχύει από εδώ και πέρα· ό,τι έχει ήδη γίνει δεν αλλάζει.";
const NOT_ALLOWED: FormState = {
  error: "Δεν έχεις Δικαίωμα για αυτή την αλλαγή ή η τιμή δεν υπάρχει πια.",
};

type Supabase = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;
interface Written {
  data: unknown;
  error: { code?: string; message: string } | null;
}
interface ItemTarget {
  supabase: Supabase;
  table: string;
  id: string;
}
type Affected = { ok: true; label: string } | { ok: false; state: FormState };

const rowsSchema = z.array(z.object({ label: z.string() }));
const sortsSchema = z.array(z.object({ sort: z.number() }));

// Μια εγγραφή που δεν άγγιξε καμία γραμμή (RLS ή τιμή που έφυγε) δεν πρέπει να φαίνεται επιτυχία.
const toAffected = ({ data, error }: Written): Affected => {
  if (error) return { ok: false, state: { error: messageOf(error) } };
  const label = rowsSchema.safeParse(data);
  const first = label.success ? label.data[0]?.label : undefined;
  return first === undefined
    ? { ok: false, state: NOT_ALLOWED }
    : { ok: true, label: first };
};

async function onItem(
  ref: { list: ListName; id: string },
  write: (target: ItemTarget) => PromiseLike<Written>,
): Promise<Affected> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false, state: UNCONFIGURED };
  const table = LIST_TABLES[ref.list];
  return toAffected(await write({ supabase, table, id: ref.id }));
}

const done = (
  result: Affected,
  notice: (label: string) => string,
): FormState => {
  if (!result.ok) return result.state;
  refreshSales();
  return { notice: notice(result.label) };
};

export async function createListItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = createListItemSchema.safeParse(pick(form, ["list", "label"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const table = LIST_TABLES[parsed.data.list];
  const sorts = await supabase.from(table).select("sort");
  if (sorts.error) return { error: messageOf(sorts.error) };
  const existing = sortsSchema.safeParse(sorts.data);
  if (!existing.success) return NOT_ALLOWED;
  const { error } = await supabase
    .from(table)
    .insert({ label: parsed.data.label, sort: nextSort(existing.data) });
  if (error) return { error: messageOf(error) };
  refreshSales();
  return { notice: SAVED_NOTICE };
}

export async function renameListItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = renameListItemSchema.safeParse(
    pick(form, ["list", "id", "label"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { label } = parsed.data;
  const result = await onItem(parsed.data, ({ supabase, table, id }) =>
    supabase.from(table).update({ label }).eq("id", id).select("label"),
  );
  return done(result, () => SAVED_NOTICE);
}

export async function moveListItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = moveListItemSchema.safeParse(
    pick(form, ["list", "id", "direction"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("sales_move_list_item", {
    p_list: parsed.data.list,
    p_id: parsed.data.id,
    p_direction: parsed.data.direction,
  });
  return finishWith(outcome, SAVED_NOTICE);
}

export async function retireListItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = listItemRefSchema.safeParse(pick(form, ["list", "id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const result = await onItem(parsed.data, ({ supabase, table, id }) =>
    supabase
      .from(table)
      .update({ retired_at: new Date().toISOString() })
      .eq("id", id)
      .select("label"),
  );
  return done(
    result,
    (label) =>
      `«${label}» αποσύρθηκε: φεύγει από τις νέες επιλογές, μένει στα παλιά στοιχεία και μετριέται στις Αναφορές.`,
  );
}

export async function reactivateListItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = listItemRefSchema.safeParse(pick(form, ["list", "id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const result = await onItem(parsed.data, ({ supabase, table, id }) =>
    supabase
      .from(table)
      .update({ retired_at: null })
      .eq("id", id)
      .select("label"),
  );
  return done(result, () => SAVED_NOTICE);
}

export async function deleteListItem(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = listItemRefSchema.safeParse(pick(form, ["list", "id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const result = await onItem(parsed.data, ({ supabase, table, id }) =>
    supabase.from(table).delete().eq("id", id).select("label"),
  );
  return done(
    result,
    (label) => `«${label}» διαγράφηκε: δεν είχε χρησιμοποιηθεί ποτέ.`,
  );
}

const movedText = (moved: number): string =>
  moved === 0
    ? "Δεν υπήρχαν ανοιχτές Ευκαιρίες για μεταφορά."
    : moved === 1
      ? "Μεταφέρθηκε 1 Ευκαιρία."
      : `Μεταφέρθηκαν ${moved} Ευκαιρίες.`;

const STAGE_GONE: FormState = {
  error: "Το Στάδιο έχει ήδη αποσυρθεί ή δεν υπάρχει. Ανανέωσε τη σελίδα.",
};
const stageSchema = z.object({
  label: z.string(),
  retired_at: z.string().nullable(),
});

// Το Στάδιο διαβάζεται πριν την απόσυρση: ένα που έφυγε ή αποσύρθηκε ήδη (δεύτερη καρτέλα, δεύτερο κλικ)
// δεν πρέπει να φανεί ότι αποσύρθηκε τώρα, ούτε να πει «Μεταφέρθηκαν 0 Ευκαιρίες» χωρίς να έγινε τίποτα.
async function readActiveStage(
  supabase: Supabase,
  stageId: string,
): Promise<{ ok: true; label: string } | { ok: false; state: FormState }> {
  const { data, error } = await supabase
    .from("sales_stages")
    .select("label, retired_at")
    .eq("id", stageId)
    .maybeSingle();
  if (error) return { ok: false, state: { error: messageOf(error) } };
  const stage = stageSchema.safeParse(data);
  if (!stage.success || stage.data.retired_at !== null)
    return { ok: false, state: STAGE_GONE };
  return { ok: true, label: stage.data.label };
}

export async function retireStage(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = retireStageSchema.safeParse(
    pick(form, ["stageId", "moveToId"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const stage = await readActiveStage(supabase, parsed.data.stageId);
  if (!stage.ok) return stage.state;
  const { data, error } = await supabase.rpc("sales_retire_stage", {
    p_stage: parsed.data.stageId,
    p_move_to: parsed.data.moveToId || null,
  });
  if (error) return { error: messageOf(error) };
  refreshSales();
  const moved = z.number().safeParse(data);
  return {
    notice: `${movedText(moved.success ? moved.data : 0)} «${stage.label}» αποσύρθηκε: φεύγει από τις νέες επιλογές και μετριέται στις Αναφορές.`,
  };
}

export async function saveFormRouting(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = routingSchema.safeParse(pick(form, ["value"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const routing = parseRoutingValue(parsed.data.value);
  if (!routing) return { error: "Διάλεξε πού πάνε οι νέες Ευκαιρίες." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { data, error } = await supabase
    .from("sales_settings")
    .update({
      form_routing: routing.routing,
      form_assignee_id: routing.assigneeId,
    })
    .eq("id", true)
    .select("form_routing");
  if (error) return { error: messageOf(error) };
  if (!data || data.length === 0) return NOT_ALLOWED;
  refreshSales();
  return { notice: SAVED_NOTICE };
}
