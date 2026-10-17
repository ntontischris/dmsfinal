import { createSupabase } from "@/lib/supabase/server";

import {
  parseAuditOptions,
  parseAuditPage,
  type AuditOptions,
  type AuditPage,
} from "./schema";
import { rpcFilters, type AuditQuery } from "./url";

// Ανάγνωση του Ίχνους (P1). Όλα περνούν από RPC: η βάση ελέγχει το «Βλέπει ίχνος ενεργειών», κρίνει τι φαίνεται ανά γραμμή
// και κρύβει ποσά και κόστος. Το σφάλμα καταγράφεται· ο Χρήστης βλέπει «δεν φόρτωσε».

export type ReadResult<T> = { ok: true; data: T } | { ok: false };

async function read<T>(
  label: string,
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  parse: (data: unknown) => T,
): Promise<ReadResult<T>> {
  const { data, error } = await query;
  if (error) {
    console.error(`${label}:`, error.message);
    return { ok: false };
  }
  return { ok: true, data: parse(data) };
}

export async function getAuditPage(
  query: AuditQuery,
): Promise<ReadResult<AuditPage>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getAuditPage",
    supabase.rpc("audit_trail", {
      p_filters: rpcFilters(query.filters),
      p_before_at: query.cursor?.at ?? null,
      p_before_id: query.cursor ? Number(query.cursor.id) : null,
    }),
    parseAuditPage,
  );
}

export async function getAuditOptions(): Promise<ReadResult<AuditOptions>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getAuditOptions",
    supabase.rpc("audit_trail_options"),
    parseAuditOptions,
  );
}
