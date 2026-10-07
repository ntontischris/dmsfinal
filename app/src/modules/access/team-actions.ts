"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { diffGrants, isScope, type Grants } from "./permissions";
import { getRole } from "./queries";
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

export async function saveRole(
  _: FormState,
  form: FormData,
): Promise<FormState> {
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

  const { error: roleError } = await supabase
    .from("roles")
    .update({ name: parsed.data.name, description: parsed.data.description })
    .eq("id", parsed.data.id);
  if (roleError)
    return { error: messageOf(roleError, "Ο Ρόλος δεν αποθηκεύτηκε.") };

  const changes = diffGrants(current.data.grants, grantsFromForm(form));
  const removed = changes
    .filter((c) => c.after === null)
    .map((c) => c.permission);
  const upserts = changes.flatMap((c) =>
    c.after
      ? [{ role_id: parsed.data.id, permission: c.permission, scope: c.after }]
      : [],
  );
  if (removed.length > 0) {
    const { error } = await supabase
      .from("role_permissions")
      .delete()
      .eq("role_id", parsed.data.id)
      .in("permission", removed);
    if (error)
      return { error: messageOf(error, "Τα Δικαιώματα δεν αποθηκεύτηκαν.") };
  }
  if (upserts.length > 0) {
    const { error } = await supabase.from("role_permissions").upsert(upserts);
    if (error)
      return { error: messageOf(error, "Τα Δικαιώματα δεν αποθηκεύτηκαν.") };
  }
  revalidatePath("/app/team", "layout");
  const holders = current.data.holders.length;
  return {
    notice: `Αποθηκεύτηκε (${changes.length} αλλαγές). Ισχύει από την επόμενη ενέργεια ${holders === 1 ? "του 1 Χρήστη" : `των ${holders} Χρηστών`} που τον έχουν.`,
  };
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

  const source = parsed.data.copyFrom
    ? await getRole(parsed.data.copyFrom)
    : null;
  const { data, error } = await supabase
    .from("roles")
    .insert({
      name: parsed.data.name,
      kind: parsed.data.kind,
      description:
        source?.ok && source.data ? `Αντίγραφο του «${source.data.name}».` : "",
    })
    .select("id")
    .single();
  if (error || !data)
    return {
      error: messageOf(
        error ?? { message: "χωρίς id" },
        "Ο Ρόλος δεν δημιουργήθηκε.",
      ),
    };

  const copied =
    source?.ok && source.data && !source.data.isOwner
      ? Object.entries(source.data.grants)
      : [];
  if (copied.length > 0) {
    const { error: grantError } = await supabase
      .from("role_permissions")
      .insert(
        copied.map(([permission, scope]) => ({
          role_id: data.id,
          permission,
          scope,
        })),
      );
    if (grantError)
      return {
        error: messageOf(
          grantError,
          "Ο Ρόλος δημιουργήθηκε, αλλά τα Δικαιώματα δεν αντιγράφηκαν.",
        ),
      };
  }
  revalidatePath("/app/team", "layout");
  redirect(`/app/team/roles/${data.id}`);
}

export async function deleteRole(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success) return { error: "Ο Ρόλος δεν βρέθηκε." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { error } = await supabase.from("roles").delete().eq("id", id.data);
  if (error) return { error: messageOf(error, "Ο Ρόλος δεν διαγράφηκε.") };
  revalidatePath("/app/team", "layout");
  redirect("/app/team/roles");
}

export async function setUserRoles(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const userId = z.uuid().safeParse(form.get("userId"));
  if (!userId.success) return { error: "Ο Χρήστης δεν βρέθηκε." };
  const wanted = new Set(form.getAll("role").map(String));
  if (wanted.size === 0)
    return { error: "Ένας Χρήστης ομάδας θέλει τουλάχιστον έναν Ρόλο." };
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;

  const { data: rows, error: readError } = await supabase
    .from("team_user_roles")
    .select("role_id")
    .eq("user_id", userId.data);
  if (readError || !rows)
    return {
      error: messageOf(
        readError ?? { message: "" },
        "Οι Ρόλοι δεν διαβάστηκαν.",
      ),
    };
  const current = new Set(rows.map((row: { role_id: string }) => row.role_id));
  const added = [...wanted].filter((id) => !current.has(id));
  const removed = [...current].filter((id) => !wanted.has(id));

  if (added.length > 0) {
    const { error } = await supabase
      .from("team_user_roles")
      .insert(
        added.map((roleId) => ({ user_id: userId.data, role_id: roleId })),
      );
    if (error)
      return { error: messageOf(error, "Οι Ρόλοι δεν αποθηκεύτηκαν.") };
  }
  if (removed.length > 0) {
    const { error } = await supabase
      .from("team_user_roles")
      .delete()
      .eq("user_id", userId.data)
      .in("role_id", removed);
    if (error)
      return { error: messageOf(error, "Οι Ρόλοι δεν αποθηκεύτηκαν.") };
  }
  revalidatePath("/app/team", "layout");
  return {
    notice: "Οι Ρόλοι αποθηκεύτηκαν. Ισχύουν από την επόμενη ενέργειά του.",
  };
}

export async function setUserActive(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const userId = z.uuid().safeParse(form.get("userId"));
  if (!userId.success) return { error: "Ο Χρήστης δεν βρέθηκε." };
  const isActive = form.get("active") === "true";
  const supabase = await createSupabase();
  if (!supabase) return UNCONFIGURED;
  const { data, error } = await supabase
    .from("team_users")
    .update({ is_active: isActive })
    .eq("user_id", userId.data)
    .select("user_id");
  if (error) return { error: messageOf(error, "Η αλλαγή δεν αποθηκεύτηκε.") };
  if (!data || data.length === 0)
    return { error: "Δεν έχεις Δικαίωμα για αυτή την αλλαγή." };
  revalidatePath("/app/team", "layout");
  return {
    notice: isActive
      ? "Ο Χρήστης επανενεργοποιήθηκε, με τους Ρόλους του."
      : "Ο Χρήστης απενεργοποιήθηκε. Δεν έχει πια πρόσβαση.",
  };
}
