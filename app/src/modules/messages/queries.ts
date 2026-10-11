import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import {
  parseClientContext,
  parseInbox,
  parseMentions,
  parseThread,
  parseWritableClients,
  type ClientContext,
  type Inbox,
  type MentionItem,
  type Thread,
  type WritableClient,
} from "./view-schema";

// Ανάγνωση των Μηνυμάτων. Όλα περνούν από RPC· η βάση αποφασίζει ποιος βλέπει τι.

export async function getInbox(): Promise<ReadResult<Inbox>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getInbox", supabase.rpc("messages_inbox"), parseInbox);
}

export async function getMentions(): Promise<ReadResult<MentionItem[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getMentions", supabase.rpc("messages_mentions"), parseMentions);
}

export async function getWritableClients(): Promise<ReadResult<WritableClient[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read("getWritableClients", supabase.rpc("messages_writable_clients"), parseWritableClients);
}

// null = ο θεατής δεν έχει τίποτα σε αυτή τη Συνομιλία (42501, ίδιο με ανύπαρκτη).
export type ThreadResult = ReadResult<Thread | null>;

export async function getThread(clientId: string): Promise<ThreadResult> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("messages_thread", { p_client: clientId });
  if (error?.code === "42501") return { ok: true, data: null };
  if (error) {
    console.error("getThread:", error.message);
    return { ok: false };
  }
  return { ok: true, data: parseThread(data) };
}

// Ο Πελάτης του Χρήστη πελάτη και τα λεπτά της σύνοψης αδιάβαστων. 42501 = δεν έχει Συνομιλία (null).
export async function getClientContext(): Promise<ReadResult<ClientContext | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const { data, error } = await supabase.rpc("messages_client_context");
  if (error?.code === "42501") return { ok: true, data: null };
  if (error) {
    console.error("getClientContext:", error.message);
    return { ok: false };
  }
  return { ok: true, data: parseClientContext(data) };
}
