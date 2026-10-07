"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/lib/form-state";
import { createSupabase } from "@/lib/supabase/server";

import { isValidAfm, isValidIban, normalizeIban } from "./validation";

// Ενέργειες Ρυθμίσεων › Εταιρεία και Ελέγχου ετοιμότητας. Κάθε κάρτα αποθηκεύεται χωριστά.
// Τα «μόνο Ιδιοκτήτης» τα επιβάλλει η βάση· εδώ μεταφράζεται η άρνηση σε κατανοητό μήνυμα.

const UNCONFIGURED: FormState = { error: "Η βάση δεν έχει συνδεθεί ακόμα." };
const SAVED: FormState = {
  notice:
    "Αποθηκεύτηκε. Ισχύει από εδώ και πέρα· ό,τι έχει ήδη γίνει δεν αλλάζει.",
};

const messageOf = (error: { code?: string; message: string }): string => {
  if (error.code === "P0001") return error.message;
  if (error.code === "42501") return "Δεν έχεις Δικαίωμα για αυτή την αλλαγή.";
  if (error.code === "23505") return "Υπάρχει ήδη αυτή η τιμή.";
  if (error.code === "23514") return "Μια τιμή δεν είναι έγκυρη.";
  console.error("settings", error.message);
  return "Η αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά.";
};

const text = z.string().trim();
const firstIssue = (error: z.ZodError): FormState => ({
  error: error.issues[0]?.message,
});

// Αποθηκεύει μια κάρτα των στοιχείων εταιρείας μόνο αν δεν άλλαξε στο μεταξύ (updated_at ίδιο με αυτό που είδε ο Χρήστης).
async function saveCompanyCard(
  values: Record<string, unknown>,
  version: string,
): Promise<FormState> {
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { data, error } = await supabase
    .from("company_settings")
    .update(values)
    .eq("id", true)
    .eq("updated_at", version)
    .select("updated_at");
  if (error) return { error: messageOf(error) };
  if (!data || data.length === 0) {
    const { data: current } = await supabase
      .from("company_settings")
      .select("updated_at, updated_by")
      .single();
    const { data: who } = current?.updated_by
      ? await supabase
          .from("team_users")
          .select("name")
          .eq("user_id", current.updated_by)
          .maybeSingle()
      : { data: null };
    const when = current
      ? new Date(current.updated_at).toLocaleString("el-GR", {
          timeZone: "Europe/Athens",
        })
      : "";
    revalidatePath("/app/settings", "layout");
    return {
      error: `Τα στοιχεία άλλαξαν στο μεταξύ από ${who?.name ?? "άλλον Χρήστη"} (${when}). Δες τις νέες τιμές και αποθήκευσε ξανά.`,
    };
  }
  revalidatePath("/app/settings", "layout");
  return SAVED;
}

const detailsSchema = z.object({
  legal_name: text,
  trade_name: text,
  address: text,
  phone: text,
  email: z.union([
    z.literal(""),
    z.email("Το email της εταιρείας δεν είναι έγκυρο."),
  ]),
  reply_to_email: z.union([
    z.literal(""),
    z.email("Το email απαντήσεων δεν είναι έγκυρο."),
  ]),
  signatory_name: text,
  signatory_title: text,
});

export async function saveCompanyDetails(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = detailsSchema.safeParse(
    Object.fromEntries(
      Object.keys(detailsSchema.shape).map((key) => [key, form.get(key) ?? ""]),
    ),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  return saveCompanyCard(parsed.data, String(form.get("version")));
}

const taxSchema = z.object({
  tax_id: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || isValidAfm(value),
      "Το ΑΦΜ δεν είναι έγκυρο (9 ψηφία, σωστό ψηφίο ελέγχου).",
    ),
  tax_office: text,
  gemi: z
    .string()
    .trim()
    .regex(/^(\d{9,12})?$/, "Ο αριθμός ΓΕΜΗ θέλει 9 έως 12 ψηφία."),
  vat_rate: z.coerce
    .number()
    .min(0, "Ο ΦΠΑ δεν είναι έγκυρος.")
    .max(99, "Ο ΦΠΑ δεν είναι έγκυρος."),
});

export async function saveTaxDetails(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = taxSchema.safeParse(
    Object.fromEntries(
      Object.keys(taxSchema.shape).map((key) => [key, form.get(key) ?? ""]),
    ),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  return saveCompanyCard(parsed.data, String(form.get("version")));
}

const assistantSchema = z.object({
  widget_messages_per_conversation: z.coerce
    .number()
    .int()
    .min(1, "Το όριο θέλει τουλάχιστον 1 μήνυμα."),
  widget_messages_per_ip_day: z.coerce
    .number()
    .int()
    .min(1, "Το όριο θέλει τουλάχιστον 1 μήνυμα."),
});

export async function saveAssistantLimits(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = assistantSchema.safeParse(
    Object.fromEntries(
      Object.keys(assistantSchema.shape).map((key) => [key, form.get(key)]),
    ),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  return saveCompanyCard(parsed.data, String(form.get("version")));
}

const capSchema = z.object({
  ai_monthly_cap_usd: z.coerce.number().min(0, "Το πλαφόν δεν είναι έγκυρο."),
  ai_widget_share: z.coerce
    .number()
    .int()
    .min(0)
    .max(100, "Το μερίδιο είναι από 0 έως 100%."),
});

export async function saveAssistantCap(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = capSchema.safeParse(
    Object.fromEntries(
      Object.keys(capSchema.shape).map((key) => [key, form.get(key)]),
    ),
  );
  if (!parsed.success) return firstIssue(parsed.error);
  return saveCompanyCard(parsed.data, String(form.get("version")));
}

const bankSchema = z.object({
  bank_name: text.min(1, "Γράψε την τράπεζα."),
  holder: text.min(1, "Γράψε τον δικαιούχο."),
  iban: z
    .string()
    .transform(normalizeIban)
    .refine(isValidIban, "Το IBAN δεν είναι έγκυρο. Έλεγξε τα ψηφία."),
});

export async function addBankAccount(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = bankSchema.safeParse({
    bank_name: form.get("bank_name"),
    holder: form.get("holder"),
    iban: String(form.get("iban") ?? ""),
  });
  if (!parsed.success) return firstIssue(parsed.error);
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { count } = await supabase
    .from("bank_accounts")
    .select("id", { count: "exact", head: true })
    .eq("is_default", true);
  const { error } = await supabase
    .from("bank_accounts")
    .insert({ ...parsed.data, is_default: (count ?? 0) === 0 });
  if (error) return { error: messageOf(error) };
  revalidatePath("/app/settings", "layout");
  return { notice: "Ο λογαριασμός προστέθηκε." };
}

export async function setDefaultBankAccount(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Ο λογαριασμός δεν βρέθηκε." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error: clearError } = await supabase
    .from("bank_accounts")
    .update({ is_default: false })
    .eq("is_default", true);
  if (clearError) return { error: messageOf(clearError) };
  const { error } = await supabase
    .from("bank_accounts")
    .update({ is_default: true })
    .eq("id", id.data);
  if (error) return { error: messageOf(error) };
  revalidatePath("/app/settings", "layout");
  return {
    notice:
      "Ο προεπιλεγμένος λογαριασμός άλλαξε· ισχύει στις νέες εντολές πληρωμής.",
  };
}

export async function retireBankAccount(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Ο λογαριασμός δεν βρέθηκε." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase
    .from("bank_accounts")
    .update({ retired_at: new Date().toISOString() })
    .eq("id", id.data)
    .eq("is_default", false);
  if (error) return { error: messageOf(error) };
  revalidatePath("/app/settings", "layout");
  return {
    notice:
      "Ο λογαριασμός αποσύρθηκε: δεν προτείνεται πια, αλλά μένει στα παλιά στοιχεία.",
  };
}

const CONFIRMABLE = z.enum(["legal_texts", "identity_values"]);

export async function setReadinessConfirmation(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const item = CONFIRMABLE.safeParse(form.get("item"));
  if (!item.success) return { error: "Άγνωστη γραμμή." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Συνδέσου ξανά." };
  const { error } =
    form.get("confirmed") === "true"
      ? await supabase
          .from("readiness_confirmations")
          .insert({ item: item.data, confirmed_by: auth.user.id })
      : await supabase
          .from("readiness_confirmations")
          .delete()
          .eq("item", item.data);
  if (error) return { error: messageOf(error) };
  revalidatePath("/app/settings", "layout");
  return { notice: "Αποθηκεύτηκε." };
}

export async function openToClients(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  if (form.get("confirm") !== "ΑΝΟΙΓΜΑ")
    return { error: "Γράψε «ΑΝΟΙΓΜΑ» για να επιβεβαιώσεις." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Συνδέσου ξανά." };
  const { data, error } = await supabase
    .from("system_state")
    .update({ opened_at: new Date().toISOString(), opened_by: auth.user.id })
    .eq("id", true)
    .select("opened_at");
  if (error) return { error: messageOf(error) };
  if (!data || data.length === 0)
    return { error: "Το «Άνοιγμα σε πελάτες» το κάνει μόνο ο Ιδιοκτήτης." };
  revalidatePath("/app", "layout");
  return { notice: "Το σύστημα άνοιξε σε πελάτες." };
}
