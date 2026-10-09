import { connection } from "next/server";
import { cache } from "react";
import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { isScope, type Grants } from "./permissions";

// Ποιος βλέπει τη σελίδα. Μία φορά ανά αίτημα (cache), όσες οθόνες κι αν το ρωτήσουν.
export interface TeamMember {
  name: string;
  isOwner: boolean;
  permissions: Grants;
}

export type Viewer =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | {
      status: "signed-in";
      userId: string;
      email: string;
      team: TeamMember | null;
      // Τα Δικαιώματα πελάτη (c.*) της τρέχουσας συμμετοχής· μόνο για Χρήστες πελάτη.
      clientGrants?: Grants;
    };

// Ο Χρήστης ομάδας με τους Ρόλους του, όπως τον επιστρέφει η βάση (η RLS δείχνει μόνο ό,τι επιτρέπεται).
const memberSchema = z.object({
  name: z.string(),
  team_user_roles: z.array(
    z.object({ roles: z.object({ is_owner: z.boolean() }).nullable() }),
  ),
});
const permissionsSchema = z.array(
  z.object({ permission: z.string(), scope: z.string() }),
);

const toGrants = (rows: z.infer<typeof permissionsSchema>): Grants =>
  Object.fromEntries(
    rows.flatMap((row) =>
      isScope(row.scope) ? [[row.permission, row.scope]] : [],
    ),
  );

export const getViewer = cache(async (): Promise<Viewer> => {
  // Η συνεδρία διαβάζεται πάντα τη στιγμή του αιτήματος, ποτέ στο build.
  await connection();
  const supabase = await createSupabase();
  if (!supabase) return { status: "unconfigured" };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "anonymous" };

  const [memberResult, permissionsResult] = await Promise.all([
    supabase
      .from("team_users")
      .select("name, team_user_roles(roles(is_owner))")
      .eq("user_id", auth.user.id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase.rpc("my_permissions"),
  ]);
  if (memberResult.error)
    console.error("getViewer: team_users", memberResult.error.message);
  if (permissionsResult.error)
    console.error("getViewer: my_permissions", permissionsResult.error.message);

  const member = memberSchema.safeParse(memberResult.data);
  const permissions = permissionsSchema.safeParse(permissionsResult.data ?? []);
  const grants = permissions.success ? toGrants(permissions.data) : {};
  return {
    status: "signed-in",
    userId: auth.user.id,
    email: auth.user.email ?? "",
    team: member.success
      ? {
          name: member.data.name,
          isOwner: member.data.team_user_roles.some(
            (row) => row.roles?.is_owner === true,
          ),
          permissions: grants,
        }
      : null,
    clientGrants: clientOnly(grants),
  };
});

const clientOnly = (grants: Grants): Grants =>
  Object.fromEntries(Object.entries(grants).filter(([permission]) => permission.startsWith("c.")));

// Ο Χρήστης έχει αυτό το Δικαίωμα (ομάδας ή πελάτη, με οποιοδήποτε Εύρος)· για την οθόνη μόνο, αποφασίζει η βάση.
export const can = (viewer: Viewer, permission: string): boolean =>
  viewer.status === "signed-in" &&
  (viewer.team?.permissions[permission] !== undefined || viewer.clientGrants?.[permission] !== undefined);

export const isOwner = (viewer: Viewer): boolean =>
  viewer.status === "signed-in" && viewer.team?.isOwner === true;
