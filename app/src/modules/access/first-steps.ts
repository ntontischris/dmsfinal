import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

// a3 «Πρώτα βήματα»: τα κείμενα των Ρόλων του τρέχοντα Χρήστη, μέχρι να πατήσει «Κατάλαβα».

export interface FirstStep {
  role: string;
  body: string;
}

const firstStepsSchema = z.array(
  z.object({ role: z.string(), body: z.string() }),
);

// Τι δείχνει η κάρτα τώρα. Σε σφάλμα δεν δείχνει τίποτα: η κάρτα είναι βοήθεια, όχι δουλειά.
export async function getFirstSteps(): Promise<readonly FirstStep[]> {
  const supabase = await createSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("first_steps_view");
  if (error) {
    console.error("getFirstSteps:", error.message);
    return [];
  }
  const parsed = firstStepsSchema.safeParse(data);
  return parsed.success ? parsed.data : [];
}

// Το κείμενο ενός Ρόλου για τη φόρμα του Ιδιοκτήτη· null αν η ανάγνωση απέτυχε.
export async function getRoleFirstSteps(
  roleId: string,
): Promise<string | null> {
  const supabase = await createSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("role_first_steps_get", {
    p_role_id: roleId,
  });
  if (error) {
    console.error("getRoleFirstSteps:", error.message);
    return null;
  }
  return typeof data === "string" ? data : null;
}
