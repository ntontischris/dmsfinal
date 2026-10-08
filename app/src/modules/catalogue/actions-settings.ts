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
  refreshCatalogue,
} from "./action-support";
import { formatMonth, nextSort } from "./helpers";
import {
  kindFieldsSchema,
  kindRefSchema,
  moveKindSchema,
  saveCostMonthSchema,
  saveMultipliersSchema,
  updateKindSchema,
} from "./settings-schemas";

// Ενέργειες Ρυθμίσεων › Συμφωνίες (O3) και Οικονομικά (O6). Τα Είδη Παροχής γράφονται απευθείας με RLS
// («Διαχειρίζεται Ρυθμίσεις»)· τους κανόνες (χρησιμοποιημένο δεν διαγράφεται, το τελευταίο ενεργό δεν αποσύρεται)
// τους επιβάλλει η βάση. Ο μήνας Κόστους ώρας και οι πολλαπλασιαστές περνούν από RPC.

const SAVED_NOTICE =
  "Αποθηκεύτηκε. Ισχύει από εδώ και πέρα· ό,τι έχει ήδη γίνει δεν αλλάζει.";
const NOT_ALLOWED: FormState = {
  error: "Δεν έχεις Δικαίωμα για αυτή την αλλαγή ή η τιμή δεν υπάρχει πια.",
};
const KIND_FIELDS = [
  "label",
  "labelEn",
  "unit",
  "unitEn",
  "measure",
  "defaultHours",
] as const;

type Supabase = NonNullable<Awaited<ReturnType<typeof createSupabase>>>;
interface Written {
  data: unknown;
  error: { code?: string; message: string } | null;
}
type Affected = { ok: true; label: string } | { ok: false; state: FormState };

const rowsSchema = z.array(z.object({ label: z.string() }));
const sortsSchema = z.array(z.object({ sort: z.number() }));

// Μια εγγραφή που δεν άγγιξε καμία γραμμή (RLS ή τιμή που έφυγε) δεν πρέπει να φαίνεται επιτυχία.
const toAffected = ({ data, error }: Written): Affected => {
  if (error) return { ok: false, state: { error: messageOf(error) } };
  const rows = rowsSchema.safeParse(data);
  const first = rows.success ? rows.data[0]?.label : undefined;
  return first === undefined
    ? { ok: false, state: NOT_ALLOWED }
    : { ok: true, label: first };
};

async function onKind(
  write: (supabase: Supabase) => PromiseLike<Written>,
): Promise<Affected> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false, state: UNCONFIGURED };
  return toAffected(await write(supabase));
}

const done = (
  result: Affected,
  notice: (label: string) => string,
): FormState => {
  if (!result.ok) return result.state;
  refreshCatalogue();
  return { notice: notice(result.label) };
};

export async function createKind(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = kindFieldsSchema.safeParse(pick(form, KIND_FIELDS));
  if (!parsed.success) return firstIssue(parsed.error);
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const sorts = await supabase.from("provision_kinds").select("sort");
  if (sorts.error) return { error: messageOf(sorts.error) };
  const existing = sortsSchema.safeParse(sorts.data);
  if (!existing.success) return NOT_ALLOWED;
  const kind = parsed.data;
  const { error } = await supabase.from("provision_kinds").insert({
    label: kind.label,
    label_en: kind.labelEn,
    unit: kind.unit,
    unit_en: kind.unitEn,
    measure: kind.measure,
    default_hours: kind.defaultHours,
    sort: nextSort(existing.data),
  });
  if (error) return { error: messageOf(error) };
  refreshCatalogue();
  return { notice: SAVED_NOTICE };
}

export async function updateKind(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = updateKindSchema.safeParse(pick(form, ["id", ...KIND_FIELDS]));
  if (!parsed.success) return firstIssue(parsed.error);
  const kind = parsed.data;
  const result = await onKind((supabase) =>
    supabase
      .from("provision_kinds")
      .update({
        label: kind.label,
        label_en: kind.labelEn,
        unit: kind.unit,
        unit_en: kind.unitEn,
        measure: kind.measure,
        default_hours: kind.defaultHours,
      })
      .eq("id", kind.id)
      .select("label"),
  );
  return done(result, () => SAVED_NOTICE);
}

export async function moveKind(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = moveKindSchema.safeParse(pick(form, ["id", "direction"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("catalogue_move_kind", {
    p_id: parsed.data.id,
    p_direction: parsed.data.direction,
  });
  return finishWith(outcome, SAVED_NOTICE);
}

export async function retireKind(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = kindRefSchema.safeParse(pick(form, ["id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const result = await onKind((supabase) =>
    supabase
      .from("provision_kinds")
      .update({ retired_at: new Date().toISOString() })
      .eq("id", parsed.data.id)
      .select("label"),
  );
  return done(
    result,
    (label) =>
      `«${label}» αποσύρθηκε: φεύγει από τις νέες επιλογές, μένει στα παλιά στοιχεία.`,
  );
}

export async function reactivateKind(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = kindRefSchema.safeParse(pick(form, ["id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const result = await onKind((supabase) =>
    supabase
      .from("provision_kinds")
      .update({ retired_at: null })
      .eq("id", parsed.data.id)
      .select("label"),
  );
  return done(result, () => SAVED_NOTICE);
}

export async function deleteKind(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = kindRefSchema.safeParse(pick(form, ["id"]));
  if (!parsed.success) return firstIssue(parsed.error);
  const result = await onKind((supabase) =>
    supabase
      .from("provision_kinds")
      .delete()
      .eq("id", parsed.data.id)
      .select("label"),
  );
  return done(
    result,
    (label) => `«${label}» διαγράφηκε: δεν είχε χρησιμοποιηθεί ποτέ.`,
  );
}

export async function saveCostMonth(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = saveCostMonthSchema.safeParse(
    pick(form, ["month", "expensesTotal", "productiveHours"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const { month, expensesTotal, productiveHours } = parsed.data;
  const outcome = await callRpc("cost_save_month", {
    p_month: month,
    p_expenses_total: expensesTotal,
    p_productive_hours: productiveHours,
  });
  return finishWith(
    outcome,
    `Αποθηκεύτηκε. Ισχύει από τον ${formatMonth(month)} και μετά· οι κλεισμένοι μήνες δεν αλλάζουν.`,
  );
}

export async function saveMultipliers(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = saveMultipliersSchema.safeParse(
    pick(form, ["min", "target", "max"]),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const outcome = await callRpc("cost_save_multipliers", {
    p_min: parsed.data.min,
    p_target: parsed.data.target,
    p_max: parsed.data.max,
  });
  return finishWith(
    outcome,
    "Αποθηκεύτηκε. Οι νέες ενδείξεις ισχύουν από εδώ και πέρα.",
  );
}
