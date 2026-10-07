import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { isScope, type Grants } from "./permissions";

// Ανάγνωση Ρόλων, Δικαιωμάτων και Χρηστών ομάδας. Ό,τι επιστρέφει το φιλτράρει ήδη η βάση (RLS).

export type RoleKind = "team" | "client";

export interface PermissionDef {
  code: string;
  kind: RoleKind;
  area: string;
  label: string;
  scopes: readonly string[];
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string;
  kind: RoleKind;
  isOwner: boolean;
  isBuiltin: boolean;
  grants: Grants;
  holders: readonly string[]; // user_id των Χρηστών ομάδας που τον έχουν
}

export interface TeamUserRow {
  userId: string;
  name: string;
  email: string;
  isActive: boolean;
  deactivatedAt: string | null;
  roleIds: readonly string[];
}

const kindSchema = z.enum(["team", "client"]);

const permissionSchema = z.object({
  code: z.string(),
  kind: kindSchema,
  area: z.string(),
  label: z.string(),
  scopes: z.array(z.string()),
});

const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  kind: kindSchema,
  is_owner: z.boolean(),
  is_builtin: z.boolean(),
  role_permissions: z.array(
    z.object({ permission: z.string(), scope: z.string() }),
  ),
  team_user_roles: z.array(z.object({ user_id: z.string() })),
});

const teamUserSchema = z.object({
  user_id: z.string(),
  name: z.string(),
  email: z.string(),
  is_active: z.boolean(),
  deactivated_at: z.string().nullable(),
  team_user_roles: z.array(z.object({ role_id: z.string() })),
});

const toRole = (row: z.infer<typeof roleSchema>): RoleSummary => ({
  id: row.id,
  name: row.name,
  description: row.description,
  kind: row.kind,
  isOwner: row.is_owner,
  isBuiltin: row.is_builtin,
  grants: Object.fromEntries(
    row.role_permissions.flatMap((g) =>
      isScope(g.scope) ? [[g.permission, g.scope]] : [],
    ),
  ),
  holders: row.team_user_roles.map((h) => h.user_id),
});

// Ένα αποτέλεσμα ανάγνωσης: τα δεδομένα, ή ότι κάτι απέτυχε (η οθόνη δείχνει σφάλμα, όχι κενό).
export type ReadResult<T> = { ok: true; data: T } | { ok: false };

async function read<T>(
  label: string,
  run: () => Promise<{ data: unknown; error: { message: string } | null }>,
  parse: (data: unknown) => T,
): Promise<ReadResult<T>> {
  const { data, error } = await run();
  if (error) {
    console.error(`${label}:`, error.message);
    return { ok: false };
  }
  return { ok: true, data: parse(data) };
}

export async function listPermissions(): Promise<ReadResult<PermissionDef[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listPermissions",
    async () =>
      await supabase
        .from("permissions")
        .select("code, kind, area, label, scopes")
        .order("sort"),
    (data) => z.array(permissionSchema).parse(data),
  );
}

const ROLE_COLUMNS =
  "id, name, description, kind, is_owner, is_builtin, role_permissions(permission, scope), team_user_roles(user_id)";

export async function listRoles(): Promise<ReadResult<RoleSummary[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listRoles",
    async () =>
      await supabase
        .from("roles")
        .select(ROLE_COLUMNS)
        .order("is_owner", { ascending: false })
        .order("created_at"),
    (data) => z.array(roleSchema).parse(data).map(toRole),
  );
}

export async function getRole(
  id: string,
): Promise<ReadResult<RoleSummary | null>> {
  const supabase = await createSupabase();
  if (!supabase || !z.uuid().safeParse(id).success)
    return { ok: true, data: null };
  return read(
    "getRole",
    async () =>
      await supabase
        .from("roles")
        .select(ROLE_COLUMNS)
        .eq("id", id)
        .maybeSingle(),
    (data) => (data ? toRole(roleSchema.parse(data)) : null),
  );
}

export async function listTeamUsers(): Promise<ReadResult<TeamUserRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listTeamUsers",
    async () =>
      await supabase
        .from("team_users")
        .select(
          "user_id, name, email, is_active, deactivated_at, team_user_roles(role_id)",
        )
        .order("is_active", { ascending: false })
        .order("name"),
    (data) =>
      z
        .array(teamUserSchema)
        .parse(data)
        .map((row) => ({
          userId: row.user_id,
          name: row.name,
          email: row.email,
          isActive: row.is_active,
          deactivatedAt: row.deactivated_at,
          roleIds: row.team_user_roles.map((r) => r.role_id),
        })),
  );
}
