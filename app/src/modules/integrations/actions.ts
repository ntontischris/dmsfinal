"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";
import { rpcMessage } from "@/lib/rpc-error";
import { createSupabase } from "@/lib/supabase/server";
import { getViewer, isOwner } from "@/modules/access";

import { CHECKABLE_IDS } from "./connections";
import { configuredFrom } from "./environment";
import { runLiveCheck } from "./live-checks";
import {
  analyticsIdsSchema,
  subscriptionInputSchema,
  toSubscriptionRow,
} from "./schemas";

// Ενέργειες της N5. Το «μόνο Ιδιοκτήτης» το επιβάλλει η βάση (RPC και RLS)· εδώ γίνεται μόνο το κατανοητό μήνυμα.

const PAGE = "/app/settings/integrations";
const UNCONFIGURED: FormState = { error: "Η βάση δεν έχει συνδεθεί ακόμα." };
const NOT_SET_UP: FormState = {
  error:
    "Δεν έγινε έλεγχος: η σύνδεση δεν έχει στηθεί ακόμα. Τη στήνει ο developer.",
};

const NOT_ALLOWED: FormState = { error: "Δεν έχεις Δικαίωμα για αυτή την ενέργεια." };

const firstIssue = (error: z.ZodError): FormState => ({
  error: error.issues[0]?.message,
});

const field = (form: FormData, name: string): string =>
  String(form.get(name) ?? "");

export async function checkConnectionNow(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const id = z.enum(CHECKABLE_IDS).safeParse(field(form, "connection"));
  if (!id.success) return { error: "Αυτή η σύνδεση δεν ελέγχεται από εδώ." };
  // Πρώτα ο Ιδιοκτήτης: κάποιος άλλος δεν μαθαίνει ούτε ποιες συνδέσεις έχουν στηθεί (η βάση το ξανακρίνει στο begin).
  if (!isOwner(await getViewer())) return NOT_ALLOWED;
  if (!configuredFrom()[id.data]) return NOT_SET_UP;
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const begin = await supabase.rpc("integration_check_begin", {
    p_connection: id.data,
  });
  if (begin.error)
    return { error: rpcMessage(begin.error, "Ο έλεγχος δεν ξεκίνησε.") };
  const calendarId =
    z.object({ calendarId: z.string().optional() }).safeParse(begin.data).data
      ?.calendarId ?? null;
  const outcome = await runLiveCheck(id.data, { calendarId });
  const finish = await supabase.rpc("integration_check_finish", {
    p_connection: id.data,
    p_ok: outcome.isOk,
    p_error: outcome.isOk ? null : outcome.error,
  });
  if (finish.error)
    return {
      error: rpcMessage(
        finish.error,
        "Το αποτέλεσμα του ελέγχου δεν γράφτηκε.",
      ),
    };
  revalidatePath(PAGE);
  return outcome.isOk
    ? { notice: "Η σύνδεση απαντά. Η τελευταία επιτυχία ενημερώθηκε." }
    : { error: `Η σύνδεση δεν απάντησε (${outcome.error}).` };
}

export async function saveAnalyticsIds(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = analyticsIdsSchema.safeParse({
    ga4: field(form, "ga4"),
    pixel: field(form, "pixel"),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase.rpc("company_analytics_save", {
    p_ga4: parsed.data.ga4,
    p_pixel: parsed.data.pixel,
  });
  if (error)
    return { error: rpcMessage(error, "Τα αναγνωριστικά δεν αποθηκεύτηκαν.") };
  revalidatePath(PAGE);
  return { notice: "Τα αναγνωριστικά αποθηκεύτηκαν." };
}

const writeMessage = (error: { code?: string; message: string }): string => {
  if (error.code === "23514") return "Μια τιμή δεν είναι έγκυρη.";
  return rpcMessage(error, "Η συνδρομή δεν αποθηκεύτηκε. Δοκίμασε ξανά.");
};

export async function saveSubscription(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = subscriptionInputSchema.safeParse(
    Object.fromEntries(
      [
        "provider",
        "covers",
        "plan",
        "monthlyCost",
        "currency",
        "renewsOn",
        "account",
        "paidBy",
        "link",
      ].map((name) => [name, field(form, name)]),
    ),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  const id = z.uuid().safeParse(field(form, "id"));
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const row = toSubscriptionRow(parsed.data);
  const { data, error } = id.success
    ? await supabase
        .from("subscriptions")
        .update(row)
        .eq("id", id.data)
        .select("id")
    : await supabase.from("subscriptions").insert(row).select("id");
  if (error) return { error: writeMessage(error) };
  if (!data || data.length === 0)
    return {
      error: "Η συνδρομή δεν βρέθηκε ή δεν έχεις Δικαίωμα να την αλλάξεις.",
    };
  revalidatePath(PAGE);
  return {
    notice: id.success ? "Η συνδρομή αποθηκεύτηκε." : "Η συνδρομή προστέθηκε.",
  };
}

export async function deleteSubscription(
  _state: FormState,
  form: FormData,
): Promise<FormState> {
  const id = z.uuid().safeParse(field(form, "id"));
  if (!id.success) return { error: "Δεν βρέθηκε η συνδρομή." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { data, error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id.data)
    .select("id");
  if (error) return { error: writeMessage(error) };
  if (!data || data.length === 0)
    return {
      error: "Η συνδρομή δεν βρέθηκε ή δεν έχεις Δικαίωμα να τη διαγράψεις.",
    };
  revalidatePath(PAGE);
  return { notice: "Η συνδρομή διαγράφηκε." };
}
