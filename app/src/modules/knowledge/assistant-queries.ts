import { createSupabase } from "@/lib/supabase/server";

import {
  parseConversation,
  parseConversationList,
  parseOpenCount,
  parseUnansweredList,
  type Conversation,
  type ConversationAudience,
  type ConversationList,
  type UnansweredList,
  type UnansweredStatus,
} from "./assistant-view-schema";
import { read, type ReadResult } from "./read";
import { parseManageList } from "./view-schema";

// Ανάγνωση Συζητήσεων και Αναπάντητων (#192). Όλα περνούν από RPC· η βάση ελέγχει «Διαχειρίζεται Γνώση».
// null = χωρίς Δικαίωμα (42501), ώστε η σελίδα να δείξει την άρνηση και όχι σφάλμα.

type RpcResponse = {
  data: unknown;
  error: { code?: string; message: string } | null;
};

async function readManaged<T>(
  label: string,
  call: PromiseLike<RpcResponse>,
  parse: (data: unknown) => T,
  missingCode?: string,
): Promise<ReadResult<T | null>> {
  const { data, error } = await call;
  if (error?.code === "42501" || (missingCode && error?.code === missingCode))
    return { ok: true, data: null };
  return read(label, Promise.resolve({ data, error }), parse);
}

export async function getConversations(
  audience: ConversationAudience | null,
  page: number,
): Promise<ReadResult<ConversationList | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return readManaged(
    "getConversations",
    supabase.rpc("assistant_conversations_list", {
      p_audience: audience,
      p_page: page,
    }),
    parseConversationList,
  );
}

// Μία Συζήτηση. null = χωρίς Δικαίωμα ή δεν υπάρχει (P0001: π.χ. σβήστηκε).
export async function getConversation(
  id: string,
): Promise<ReadResult<Conversation | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return readManaged(
    "getConversation",
    supabase.rpc("assistant_conversation_get", { p_id: id }),
    parseConversation,
    "P0001",
  );
}

export async function getUnanswered(
  status: UnansweredStatus,
): Promise<ReadResult<UnansweredList | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return readManaged(
    "getUnanswered",
    supabase.rpc("assistant_unanswered_list", { p_status: status }),
    parseUnansweredList,
  );
}

// Ο αριθμός των ανοιχτών για τη Διαχείριση Γνώσης (L1). null = δεν φόρτωσε ή χωρίς Δικαίωμα.
export async function getOpenUnansweredCount(): Promise<number | null> {
  const supabase = await createSupabase();
  if (!supabase) return null;
  const result = await readManaged(
    "getOpenUnansweredCount",
    supabase.rpc("assistant_unanswered_open_count"),
    parseOpenCount,
  );
  return result.ok ? result.data : null;
}

export interface CoverOption {
  id: string;
  title: string;
  isPublic: boolean;
}

// Τα δημοσιευμένα στοιχεία για το «Καλύφθηκε από…», με το αν έχουν Κοινό «δημόσιο».
export async function getCoverOptions(): Promise<ReadResult<CoverOption[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getCoverOptions",
    supabase.rpc("knowledge_manage_list", {
      p_status: "published",
      p_section: null,
    }),
    (data) =>
      parseManageList(data)
        .items.map((item) => ({
          id: item.id,
          title: item.title,
          isPublic: item.audience.isPublic,
        }))
        .sort((a, b) => a.title.localeCompare(b.title, "el")),
  );
}
