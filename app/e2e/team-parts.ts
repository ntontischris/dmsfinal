import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { test } from "@playwright/test";
import { z } from "zod";

// Βοηθητικά του e2e/team.spec.ts (Ομάδα Να #207). Το service role στήνει μόνο τα δεδομένα του τεστ (Χρήστες, Παραγωγή,
// Γύρισμα)· κάθε ενέργεια που ελέγχεται γίνεται από την οθόνη. Τα δύο projects μοιράζονται μία βάση: κάθε όνομα και email
// έχει το όνομα του project και την ώρα.

const PASSWORD = "e2e-password-123";

export const unique = (label: string): string =>
  `${label} ${test.info().project.name} ${Date.now()}`;

export const uniqueEmail = (label: string): string =>
  `${label}.${test.info().project.name}.${Date.now()}@example.com`;

export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Λείπει το NEXT_PUBLIC_SUPABASE_URL ή το SUPABASE_SERVICE_ROLE_KEY",
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function must<T>(
  label: string,
  run: PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await run;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

const idOf = (row: unknown): string => z.object({ id: z.string() }).parse(row).id;

async function account(email: string): Promise<string> {
  const { data, error } = await serviceClient().auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(
      `Ο λογαριασμός του τεστ δεν φτιάχτηκε: ${error?.message ?? ""}`,
    );
  return data.user.id;
}

async function teamRoleId(name: string): Promise<string> {
  const row = await must(
    "Ρόλος",
    serviceClient()
      .from("roles")
      .select("id")
      .eq("name", name)
      .eq("kind", "team")
      .single(),
  );
  return idOf(row);
}

// Χρήστης ομάδας με έναν Ρόλο, ενεργός ή ήδη απενεργοποιημένος.
export async function teamUser(input: {
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
}): Promise<string> {
  const userId = await account(input.email);
  const admin = serviceClient();
  await must(
    "Χρήστης ομάδας",
    admin.from("team_users").insert({
      user_id: userId,
      name: input.name,
      email: input.email,
      is_active: input.isActive ?? true,
    }),
  );
  await must(
    "Ρόλος Χρήστη",
    admin
      .from("team_user_roles")
      .insert({ user_id: userId, role_id: await teamRoleId(input.role) }),
  );
  return userId;
}

// Ένας νέος Ρόλος ομάδας (χωρίς Δικαιώματα) που τον έχει ήδη ο Χρήστης.
export async function roleHeldBy(
  name: string,
  userId: string,
): Promise<string> {
  const admin = serviceClient();
  const row = await must(
    "Νέος Ρόλος",
    admin.from("roles").insert({ name, kind: "team" }).select("id").single(),
  );
  const id = idOf(row);
  await must(
    "Ρόλος Χρήστη",
    admin.from("team_user_roles").insert({ user_id: userId, role_id: id }),
  );
  return id;
}

export interface Assignments {
  productionId: string;
  taskId: string;
  filmingId: string;
}

// Μια Εσωτερική Παραγωγή με Υπεύθυνο τον Χρήστη, μια Εργασία του και μια θέση του σε Γύρισμα σε 40 μέρες (νωρίς το πρωί,
// μακριά από τις μέρες και τις ώρες των άλλων τεστ).
export async function assignmentsOf(
  userId: string,
  title: string,
): Promise<Assignments> {
  const admin = serviceClient();
  const production = await must(
    "Παραγωγή",
    admin
      .from("productions")
      .insert({ title, owner_id: userId })
      .select("id")
      .single(),
  );
  const productionId = idOf(production);
  const task = await must(
    "Εργασία",
    admin
      .from("production_tasks")
      .insert({
        production_id: productionId,
        title: `Μοντάζ ${title}`,
        assignee_id: userId,
      })
      .select("id")
      .single(),
  );
  const startsAt = new Date(Date.now() + 40 * 86_400_000);
  startsAt.setUTCHours(3, 0, 0, 0);
  const filming = await must(
    "Γύρισμα",
    admin
      .from("filmings")
      .insert({
        production_id: productionId,
        starts_at: startsAt.toISOString(),
        hours: 2,
        origin: "team",
        state: "scheduled",
        approved_at: new Date().toISOString(),
      })
      .select("id")
      .single(),
  );
  const filmingId = idOf(filming);
  await must(
    "Συνεργείο",
    admin
      .from("filming_crew")
      .insert({ filming_id: filmingId, user_id: userId }),
  );
  return {
    productionId,
    taskId: idOf(task),
    filmingId,
  };
}

export async function productionOwner(
  productionId: string,
): Promise<string | null> {
  const row = await must(
    "Υπεύθυνος",
    serviceClient()
      .from("productions")
      .select("owner_id")
      .eq("id", productionId)
      .single(),
  );
  return z.object({ owner_id: z.string().nullable() }).parse(row).owner_id;
}

export async function isTeamUserActive(userId: string): Promise<boolean> {
  const row = await must(
    "Κατάσταση",
    serviceClient()
      .from("team_users")
      .select("is_active")
      .eq("user_id", userId)
      .single(),
  );
  return z.object({ is_active: z.boolean() }).parse(row).is_active;
}

export async function grantCount(roleIdValue: string): Promise<number> {
  const { count, error } = await serviceClient()
    .from("role_permissions")
    .select("permission", { count: "exact", head: true })
    .eq("role_id", roleIdValue);
  if (error) throw new Error(`Δικαιώματα Ρόλου: ${error.message}`);
  return count ?? 0;
}

// Ένας Πελάτης με Χρήστη πελάτη «Πλήρης» (με κωδικό, για είσοδο) και, προαιρετικά, έναν συνάδελφο ήδη μέλος.
export async function clientWithUsers(input: {
  clientName: string;
  email: string;
  name: string;
  colleague: { email: string; name: string };
}): Promise<string> {
  const admin = serviceClient();
  const client = await must(
    "Πελάτης",
    admin
      .from("clients")
      .insert({
        name: input.clientName,
        city: "Αθήνα",
        contact_name: input.name,
        contact_email: input.email,
        contact_phone: "",
      })
      .select("id")
      .single(),
  );
  const clientId = idOf(client);
  const fullRow = await must(
    "Ρόλος Πλήρης",
    admin.from("roles").select("id").eq("system_key", "client_full").single(),
  );
  const full = idOf(fullRow);
  const userId = await account(input.email);
  const colleagueId = await account(input.colleague.email);
  await must(
    "Χρήστες πελάτη",
    admin.from("client_users").insert([
      {
        client_id: clientId,
        user_id: userId,
        name: input.name,
        role_id: full,
        is_current: true,
      },
      {
        client_id: clientId,
        user_id: colleagueId,
        name: input.colleague.name,
        role_id: full,
        is_current: true,
      },
    ]),
  );
  return clientId;
}
