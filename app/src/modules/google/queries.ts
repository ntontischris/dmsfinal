import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import { googleDeletionsSchema, googleViewSchema } from "./view-schema";
import type { GoogleDeletion, GoogleView } from "./types";

// Ανάγνωση του Google. Όλα περνούν από RPC· η βάση αποφασίζει τι βλέπει ο καθένας.

export async function getGoogleView(): Promise<ReadResult<GoogleView>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getGoogleView", supabase.rpc("google_view"), (data) => googleViewSchema.parse(data));
}

export async function getGoogleDeletions(): Promise<ReadResult<GoogleDeletion[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getGoogleDeletions", supabase.rpc("google_deletions_view"), (data) =>
    googleDeletionsSchema.parse(data),
  );
}
