import { connection } from "next/server";
import { cache } from "react";
import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

// Ποιος βλέπει τη σελίδα. Μία φορά ανά αίτημα (cache), όσες οθόνες κι αν το ρωτήσουν.
export type Viewer =
  | { status: "unconfigured" }
  | { status: "anonymous" }
  | { status: "signed-in"; userId: string; email: string; team: { name: string; isOwner: boolean } | null };

// Ο Χρήστης ομάδας με τους Ρόλους του, όπως τον επιστρέφει η βάση (η RLS δείχνει μόνο ό,τι επιτρέπεται).
const memberSchema = z.object({
  name: z.string(),
  team_user_roles: z.array(z.object({ roles: z.object({ is_owner: z.boolean() }).nullable() })),
});

export const getViewer = cache(async (): Promise<Viewer> => {
  // Η συνεδρία διαβάζεται πάντα τη στιγμή του αιτήματος, ποτέ στο build.
  await connection();
  const supabase = await createSupabase();
  if (!supabase) return { status: "unconfigured" };

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "anonymous" };

  const { data, error } = await supabase
    .from("team_users")
    .select("name, team_user_roles(roles(is_owner))")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) console.error("getViewer: team_users", error.message);

  const member = memberSchema.safeParse(data);
  return {
    status: "signed-in",
    userId: auth.user.id,
    email: auth.user.email ?? "",
    team: member.success
      ? { name: member.data.name, isOwner: member.data.team_user_roles.some((row) => row.roles?.is_owner === true) }
      : null,
  };
});
