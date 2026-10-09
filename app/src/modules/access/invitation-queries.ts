import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import {
  clientUserRowSchema,
  emailLogRowSchema,
  invitationRowSchema,
  membershipRowSchema,
  type ClientUserRow,
  type EmailLogRow,
  type InvitationRow,
  type MembershipRow,
} from "./invitation-schemas";
import type { ReadResult } from "./queries";

// Ανάγνωση των Προσκλήσεων, των Χρηστών πελάτη και του Ιστορικού. Ό,τι γυρίζει το φιλτράρει η βάση.

// Σχήμα λάθους: ό,τι δεν περνά το zod γίνεται «δεν φόρτωσε», όχι κενή λίστα.
async function readRows<T>(
  call: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  parse: (rows: unknown[]) => T[],
): Promise<ReadResult<T[]>> {
  const { data, error } = await call();
  if (error) {
    console.error("access read", error.message);
    return { ok: false };
  }
  return { ok: true, data: parse(Array.isArray(data) ? data : []) };
}

// Κάθε γραμμή περνά το σχήμα της· ό,τι δεν το περνά φεύγει σιωπηλά (η βάση είναι η πηγή της αλήθειας).
const parseAll = <T>(schema: z.ZodType<T>) => (rows: unknown[]): T[] =>
  rows.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });

// Οι προσκλήσεις της ομάδας (client null) ή ενός Πελάτη.
export async function listInvitations(clientId: string | null): Promise<ReadResult<InvitationRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return readRows(() => supabase.rpc("invitations_view", { p_client: clientId }), parseAll(invitationRowSchema));
}

// Οι ενεργοί Χρήστες ενός Πελάτη.
export async function listClientUsers(clientId: string): Promise<ReadResult<ClientUserRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return readRows(() => supabase.rpc("client_users_view", { p_client: clientId }), parseAll(clientUserRowSchema));
}

// Οι Πελάτες του συνδεδεμένου Χρήστη πελάτη.
export async function listMemberships(): Promise<ReadResult<MembershipRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return readRows(() => supabase.rpc("my_client_memberships"), parseAll(membershipRowSchema));
}

// Το Ιστορικό αποστολών (μόνο Ιδιοκτήτης).
export async function listEmailLog(limit = 20): Promise<ReadResult<EmailLogRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return readRows(() => supabase.rpc("email_log_view", { p_limit: limit }), parseAll(emailLogRowSchema));
}
