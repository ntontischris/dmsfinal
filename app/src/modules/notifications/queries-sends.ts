import { createSupabase } from "@/lib/supabase/server";

import type { SendsCursor, SendsQuery } from "./sends-helpers";
import { read, type ReadResult } from "./read";
import {
  parseClientSendsPage,
  parseSendsPage,
  type ClientSendsPage,
  type SendsPage,
} from "./sends-schema";

// Ανάγνωση του Ιστορικού αποστολών (#174). Όλα περνούν από RPC· η βάση κρίνει ποιος βλέπει τι. null = χωρίς Δικαίωμα.

export const SENDS_PAGE_SIZE = 30;
export const CLIENT_SENDS_PAGE_SIZE = 20;

export async function getSends(
  query: SendsQuery,
): Promise<ReadResult<SendsPage | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getSends",
    supabase.rpc("sends_list", {
      p_tab: query.tab,
      p_channel: query.channel,
      p_client: query.client,
      p_before: query.cursor?.at ?? null,
      p_before_id: query.cursor?.id ?? null,
      p_limit: SENDS_PAGE_SIZE,
    }),
    parseSendsPage,
  );
}

export async function getClientSends(
  clientId: string,
  cursor: SendsCursor | null,
): Promise<ReadResult<ClientSendsPage | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getClientSends",
    supabase.rpc("client_sends", {
      p_client: clientId,
      p_before: cursor?.at ?? null,
      p_before_id: cursor?.id ?? null,
      p_limit: CLIENT_SENDS_PAGE_SIZE,
    }),
    parseClientSendsPage,
  );
}
