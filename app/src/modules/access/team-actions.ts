"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabase } from "@/lib/supabase/server";

import { diffGrants, isScope, type Grants } from "./permissions";
import type { Supabase } from "./provision";
import { getRole } from "./queries";
import { roleAffectedSchema, type RoleAffected } from "./role-affected";
import type { FormState } from "./schemas";

// Ενέργειες της Ομάδας (N1) και των Ρόλων (N4). Κάθε κανόνας (μόνο ο Ιδιοκτήτης, χωρίς κλιμάκωση,
// τελευταίος Ιδιοκτήτης) τον επιβάλλει η βάση· εδώ μεταφράζεται η άρνηση σε κατανοητό μήνυμα.

const UNCONFIGURED: FormState = { error: "Η βάση δεν έχει συνδεθεί ακόμα." };

// Τα μηνύματα των κανόνων της βάσης (P0001) είναι ήδη γραμμένα για τον Χρήστη.
const messageOf = (
  error: { code?: string; message: string },
  fallback: string,
): string => {
  if (error.code === "P0001") return error.message;
  if (error.code === "42501") return "Δεν έχεις Δικαίωμα για αυτή την αλλαγή.";
  if (error.code === "23505") return "Υπάρχει ήδη Ρόλος με αυτό το όνομα.";
  if (error.code === "23503")
    return "Ο Ρόλος έχει ακόμα Χρήστες· αφαίρεσέ τον πρώτα από αυτούς.";
  console.error(fallback, error.message);
  return fallback;
};

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

// «Αποθηκεύτηκε»: πόσες αλλαγές, και ποιους επηρεάζει.
const savedNotice = (changes: number, holders: number): string =>
  `Αποθηκεύτηκε (${plural(changes, "αλλαγή", "αλλαγές")}). ${
    holders === 0 ? "Κανείς δεν τον έχει ακόμα." : `Ισχύει από την επόμενη ενέργεια ${holders === 1 ? "του Χρήστη" : `των ${holders} Χρηστών`} που τον έχουν.`
  }`;

const grantsFromForm = (form: FormData): Grants =>
  Object.fromEntries(
    [...form.entries()].flatMap(([key, value]) =>
      key.startsWith("perm.") && isScope(value)
        ? [[key.slice("perm.".length), value]]
        : [],
    ),
  );

const roleFormSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1, "Ο Ρόλος θέλει όνομα."),
  description: z.string().trim(),
});

export type RoleSaveState = FormState<RoleAffected>;

// Πρώτο βήμα: ποιοι επηρεάζονται, από τη βάση. Τίποτα δεν αποθηκεύεται ακόμα.
async function affectedBy(supabase: Supabase, roleId: string): Promise<RoleSaveState> {
  const { data, error } = await supabase.rpc("role_affected_users", { p_role_id: roleId });
  if (error) return { error: messageOf(error, "Δεν βρέθηκαν οι Χρήστες του Ρόλου.") };
  const parsed = roleAffectedSchema.safeParse(data);
  return parsed.success ? { data: parsed.data } : { error: "Δεν βρέθηκαν οι Χρήστες του Ρόλου." };
}

// N4 σε δύο βήματα: χωρίς «confirmed» επιστρέφει τους επηρεαζόμενους· με «confirmed» αποθηκεύει.
export async function saveRole(
  _: RoleSaveState,
  form: FormData,
): Promise<RoleSaveState> {
  const parsed = roleFormSchema.safeParse({
    id: form.get("id"),
    name: form.get("name"),
    description: form.get("description") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const current = await getRole(parsed.data.id);
  if (!current.ok || !current.data) return { error: "Ο Ρόλος δεν βρέθηκε." };
  if (form.get("confirmed") !== "true") return affectedBy(supabase, parsed.data.id);

  // Όνομα, περιγραφή και όλα τα Δικαιώματα σε μία συναλλαγή (a6): ή όλα ή τίποτα.
  const grants = grantsFromForm(form);
  const changes = diffGrants(current.data.grants, grants);
  const { error } = await supabase.rpc("role_save", {
    p_role_id: parsed.data.id,
    p_name: parsed.data.name,
    p_description: parsed.data.description,
    p_grants: grants,
  });
  if (error) return { error: messageOf(error, "Ο Ρόλος δεν αποθηκεύτηκε.") };
  revalidatePath("/app/team", "layout");
  return { notice: savedNotice(changes.length, current.data.holders.length) };
}

const newRoleSchema = z.object({
  kind: z.enum(["team", "client"]),
  name: z.string().trim().min(1, "Ο Ρόλος θέλει όνομα."),
  copyFrom: z.uuid().optional(),
});

export async function createRole(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = newRoleSchema.safeParse({
    kind: form.get("kind"),
    name: form.get("name"),
    copyFrom: form.get("copyFrom") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;

  // Ο Ρόλος και τα αντιγραμμένα Δικαιώματα σε μία συναλλαγή (a6).
  const { data, error } = await supabase.rpc("role_create", {
    p_kind: parsed.data.kind,
    p_name: parsed.data.name,
    p_copy_from: parsed.data.copyFrom ?? null,
  });
  if (error || typeof data !== "string")
    return {
      error: messageOf(
        error ?? { message: "χωρίς id" },
        "Ο Ρόλος δεν δημιουργήθηκε.",
      ),
    };
  revalidatePath("/app/team", "layout");
  redirect(`/app/team/roles/${data}`);
}

const deleteRoleSchema = z.object({
  id: z.uuid({ error: "Ο Ρόλος δεν βρέθηκε." }),
  // Κενό = χωρίς μετακίνηση (ο Ρόλος δεν πρέπει να τον έχει κανείς).
  moveTo: z
    .string()
    .transform((value) => value || null)
    .pipe(z.uuid({ error: "Διάλεξε σε ποιον Ρόλο θα πάνε." }).nullable()),
});

// Μία κλήση (role_delete): η βάση ελέγχει «μόνο ο Ιδιοκτήτης», τους Ρόλους που δεν σβήνονται και τον προορισμό,
// μετακινεί όσους τον έχουν και τον σβήνει. Το «τον έχουν ακόμα…» (P0001) λέει ήδη τα πλήθη.
export async function deleteRole(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const parsed = deleteRoleSchema.safeParse({
    id: form.get("id"),
    moveTo: form.get("moveTo") ?? "",
  });
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? "Ο Ρόλος δεν βρέθηκε." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase.rpc("role_delete", {
    p_role_id: parsed.data.id,
    p_move_to: parsed.data.moveTo,
  });
  if (error?.code === "23503")
    return {
      error:
        "Κάποιος πήρε τον Ρόλο μόλις τώρα. Άνοιξε ξανά τη σελίδα και ξαναδοκίμασε.",
    };
  if (error) return { error: messageOf(error, "Ο Ρόλος δεν διαγράφηκε.") };
  revalidatePath("/app/team", "layout");
  redirect("/app/team/roles");
}

// Μία κλήση: η βάση ελέγχει «χωρίς κλιμάκωση» και γράφει το Γεγονός 58 για τους Ιδιοκτήτες.
export async function setUserRoles(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const userId = z.uuid().safeParse(form.get("userId"));
  if (!userId.success) return { error: "Ο Χρήστης δεν βρέθηκε." };
  const wanted = z.array(z.uuid()).safeParse([...new Set(form.getAll("role").map(String))]);
  if (!wanted.success) return { error: "Ένας από τους Ρόλους δεν βρέθηκε." };
  if (wanted.data.length === 0)
    return { error: "Ένας Χρήστης ομάδας θέλει τουλάχιστον έναν Ρόλο." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase.rpc("team_user_set_roles", {
    p_user_id: userId.data,
    p_role_ids: wanted.data,
  });
  if (error) return { error: messageOf(error, "Οι Ρόλοι δεν αποθηκεύτηκαν.") };
  revalidatePath("/app/team", "layout");
  return {
    notice: "Οι Ρόλοι αποθηκεύτηκαν. Ισχύουν από την επόμενη ενέργειά του.",
  };
}

// Η απενεργοποίηση κλείνει τις ανανεώσεις της συνεδρίας (η βάση ήδη κόβει την πρόσβαση)· η επανενεργοποίηση τις ανοίγει.
async function setAccountBan(userId: string, banned: boolean): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (error) console.error("setAccountBan", error.code ?? "άγνωστο");
  return !error;
}

// Η αλλαγή γράφεται και με γεγονός στο ίχνος (team_user_set_active)· ό,τι αποτύχει στο λογαριασμό λέγεται καθαρά.
export async function setUserActive(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const userId = z.uuid().safeParse(form.get("userId"));
  if (!userId.success) return { error: "Ο Χρήστης δεν βρέθηκε." };
  const isActive = form.get("active") === "true";
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase.rpc("team_user_set_active", {
    p_user_id: userId.data,
    p_active: isActive,
  });
  if (error) return { error: messageOf(error, "Η αλλαγή δεν αποθηκεύτηκε.") };
  if (!(await setAccountBan(userId.data, !isActive)))
    return {
      error: isActive
        ? "Ο Χρήστης ενεργοποιήθηκε στη βάση, αλλά ο λογαριασμός του δεν ξεμπλοκάρισε. Ξαναπροσπάθησε."
        : "Η πρόσβαση κόπηκε στη βάση, αλλά η συνεδρία του δεν ακυρώθηκε. Ξαναπροσπάθησε.",
    };
  revalidatePath("/app/team", "layout");
  return {
    notice: isActive
      ? "Ο Χρήστης επανενεργοποιήθηκε, με τους Ρόλους του."
      : "Ο Χρήστης απενεργοποιήθηκε. Δεν έχει πια πρόσβαση.",
  };
}
