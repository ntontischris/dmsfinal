import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type {
  AccessRequestRow,
  AssignableUser,
  DuplicatePair,
  DuplicateSide,
  QueueItem,
} from "./types";

// B5 «Χωρίς υπεύθυνο» (ουρά και Αιτήματα πρόσβασης) και B6 «Πιθανά διπλά». Τα φιλτράρει η βάση (RLS / RPC).

const queueRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  client_id: z.string(),
  source_id: z.string(),
  created_at: z.string(),
  client: z
    .object({ name: z.string(), manager_id: z.string().nullable() })
    .nullable(),
});

const flagSchema = z.array(z.object({ client_id: z.string() }));

export async function listQueue(): Promise<ReadResult<QueueItem[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const [queue, flags] = await Promise.all([
    read(
      "listQueue",
      supabase
        .from("opportunities")
        .select(
          "id, title, client_id, source_id, created_at, client:clients!opportunities_client_id_fkey(name, manager_id)",
        )
        .is("manager_id", null)
        .eq("outcome", "open")
        .order("created_at"),
      (data) => z.array(queueRowSchema).parse(data),
    ),
    // Τα σήματα τα βλέπει μόνο όποιος «Συγχωνεύει Πελάτες»· για τους άλλους η λίστα είναι κενή.
    read(
      "listQueue.flags",
      supabase
        .from("client_duplicate_flags")
        .select("client_id")
        .is("resolved_at", null),
      (data) => new Set(flagSchema.parse(data).map((flag) => flag.client_id)),
    ),
  ]);
  if (!queue.ok || !flags.ok) return { ok: false };
  return {
    ok: true,
    data: queue.data.map((row) => ({
      opportunityId: row.id,
      title: row.title,
      clientId: row.client_id,
      clientName: row.client?.name ?? "—",
      sourceId: row.source_id,
      createdAt: row.created_at,
      isNewClient: row.client?.manager_id === null,
      isPossibleDuplicate: flags.data.has(row.client_id),
    })),
  };
}

const accessRequestSchema = z.array(
  z.object({
    id: z.string(),
    client_id: z.string(),
    requester_id: z.string(),
    topic: z.string(),
    comment: z.string(),
    source_id: z.string(),
    created_at: z.string(),
    requester: z.object({ name: z.string() }).nullable(),
    client: z
      .object({
        name: z.string(),
        manager: z.object({ name: z.string() }).nullable(),
      })
      .nullable(),
  }),
);

export async function listAccessRequests(): Promise<
  ReadResult<AccessRequestRow[]>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listAccessRequests",
    supabase
      .from("access_requests")
      .select(
        "id, client_id, requester_id, topic, comment, source_id, created_at, requester:team_users!access_requests_requester_id_fkey(name), client:clients!access_requests_client_id_fkey(name, manager:team_users!clients_manager_id_fkey(name))",
      )
      .eq("status", "pending")
      .order("created_at"),
    (data) =>
      accessRequestSchema.parse(data).map((row) => ({
        id: row.id,
        clientId: row.client_id,
        clientName: row.client?.name ?? "—",
        clientManagerName: row.client?.manager?.name ?? null,
        requesterId: row.requester_id,
        requesterName: row.requester?.name ?? "—",
        topic: row.topic,
        comment: row.comment,
        sourceId: row.source_id,
        createdAt: row.created_at,
      })),
  );
}

const sideSchema = z.object({
  id: z.string(),
  name: z.string(),
  legal_name: z.string(),
  afm: z.string().nullable(),
  city: z.string(),
  contact_name: z.string(),
  contact_email: z.string(),
  contact_phone: z.string(),
  manager_name: z.string().nullable(),
  opportunities: z.number(),
});

const pairSchema = z.array(
  z.object({
    flag_id: z.string(),
    reason: z.enum(["phone", "email_domain", "name"]),
    created_at: z.string(),
    candidate: sideSchema,
    existing: sideSchema,
  }),
);

const toSide = (side: z.infer<typeof sideSchema>): DuplicateSide => ({
  id: side.id,
  name: side.name,
  legalName: side.legal_name,
  afm: side.afm,
  city: side.city,
  contactName: side.contact_name,
  contactEmail: side.contact_email,
  contactPhone: side.contact_phone,
  managerName: side.manager_name,
  opportunities: side.opportunities,
});

export async function listDuplicatePairs(): Promise<
  ReadResult<DuplicatePair[]>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listDuplicatePairs",
    supabase.rpc("sales_duplicate_pairs"),
    (data) =>
      pairSchema.parse(data).map((pair) => ({
        flagId: pair.flag_id,
        reason: pair.reason,
        createdAt: pair.created_at,
        candidate: toSide(pair.candidate),
        existing: toSide(pair.existing),
      })),
  );
}

const assignableSchema = z.array(
  z.object({ user_id: z.string(), name: z.string() }),
);

export async function listAssignableUsers(): Promise<
  ReadResult<AssignableUser[]>
> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listAssignableUsers",
    supabase.rpc("sales_assignable_users"),
    (data) =>
      assignableSchema
        .parse(data)
        .map((row) => ({ userId: row.user_id, name: row.name })),
  );
}
