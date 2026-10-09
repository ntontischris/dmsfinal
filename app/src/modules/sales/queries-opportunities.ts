import { z } from "zod";

import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type { ActivityRow, Opportunity, Pipeline } from "./types";

// Ανάγνωση Ευκαιριών και Δραστηριοτήτων. Τα φιλτράρει η βάση (RLS): εδώ δεν αποφασίζεται ποιος τι βλέπει.

export const OPPORTUNITY_COLUMNS =
  "id, client_id, title, stage_id, source_id, referred_by, manager_id, outcome, loss_reason_id, next_step, next_step_due, follows_opportunity_id, closed_at, created_at, client:clients!opportunities_client_id_fkey(name, manager_id), manager:team_users!opportunities_manager_id_fkey(name)";

export const ACTIVITY_COLUMNS =
  "id, opportunity_id, occurred_at, kind_id, event, body, previous_id, subject_id, actor:team_users!opportunity_activities_actor_id_fkey(name), opportunity:opportunities!opportunity_activities_opportunity_id_fkey(title)";

const OPEN_LIMIT = 500;
const CLOSED_LIMIT = 30;

const opportunitySchema = z.object({
  id: z.string(),
  client_id: z.string(),
  title: z.string(),
  stage_id: z.string(),
  source_id: z.string(),
  referred_by: z.string(),
  manager_id: z.string().nullable(),
  outcome: z.enum(["open", "won", "lost"]),
  loss_reason_id: z.string().nullable(),
  next_step: z.string(),
  next_step_due: z.string().nullable(),
  follows_opportunity_id: z.string().nullable(),
  closed_at: z.string().nullable(),
  created_at: z.string(),
  client: z
    .object({ name: z.string(), manager_id: z.string().nullable() })
    .nullable(),
  manager: z.object({ name: z.string() }).nullable(),
});

const activitySchema = z.object({
  id: z.string(),
  opportunity_id: z.string(),
  occurred_at: z.string(),
  kind_id: z.string().nullable(),
  event: z
    .enum(["created", "stage_changed", "assigned", "lost", "agreement"])
    .nullable(),
  body: z.string(),
  previous_id: z.string().nullable(),
  subject_id: z.string().nullable(),
  actor: z.object({ name: z.string() }).nullable(),
  opportunity: z.object({ title: z.string() }).nullable(),
});

export const toOpportunity = (
  row: z.infer<typeof opportunitySchema>,
): Opportunity => ({
  id: row.id,
  clientId: row.client_id,
  clientName: row.client?.name ?? null,
  clientManagerId: row.client?.manager_id ?? null,
  title: row.title,
  stageId: row.stage_id,
  sourceId: row.source_id,
  referredBy: row.referred_by,
  managerId: row.manager_id,
  managerName: row.manager?.name ?? null,
  outcome: row.outcome,
  lossReasonId: row.loss_reason_id,
  nextStep: row.next_step,
  nextStepDue: row.next_step_due,
  followsId: row.follows_opportunity_id,
  // Ο τίτλος της Ευκαιρίας που συνεχίζεται διαβάζεται χωριστά (getOpportunity): το PostgREST δεν λύνει αυτο-αναφορά με hint.
  followsTitle: null,
  closedAt: row.closed_at,
  createdAt: row.created_at,
});

export const parseOpportunities = (data: unknown): Opportunity[] =>
  z.array(opportunitySchema).parse(data).map(toOpportunity);

export const parseActivities = (data: unknown): ActivityRow[] =>
  z
    .array(activitySchema)
    .parse(data)
    .map((row) => ({
      id: row.id,
      opportunityId: row.opportunity_id,
      opportunityTitle: row.opportunity?.title ?? null,
      occurredAt: row.occurred_at,
      actorName: row.actor?.name ?? null,
      kindId: row.kind_id,
      event: row.event,
      body: row.body,
      previousId: row.previous_id,
      subjectId: row.subject_id,
    }));

export async function listPipeline(): Promise<ReadResult<Pipeline>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const [open, closed] = await Promise.all([
    read(
      "listPipeline.open",
      supabase
        .from("opportunities")
        .select(OPPORTUNITY_COLUMNS)
        .eq("outcome", "open")
        .order("next_step_due")
        .limit(OPEN_LIMIT),
      parseOpportunities,
    ),
    read(
      "listPipeline.closed",
      supabase
        .from("opportunities")
        .select(OPPORTUNITY_COLUMNS)
        .neq("outcome", "open")
        .order("closed_at", { ascending: false })
        .limit(CLOSED_LIMIT),
      parseOpportunities,
    ),
  ]);
  if (!open.ok || !closed.ok) return { ok: false };
  return { ok: true, data: { open: open.data, closed: closed.data } };
}

export async function getOpportunity(
  id: string,
): Promise<ReadResult<Opportunity | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  const result = await read(
    "getOpportunity",
    supabase
      .from("opportunities")
      .select(OPPORTUNITY_COLUMNS)
      .eq("id", id)
      .maybeSingle(),
    (data) =>
      data === null ? null : toOpportunity(opportunitySchema.parse(data)),
  );
  if (!result.ok || !result.data?.followsId) return result;
  const followed = await read(
    "getOpportunity.follows",
    supabase
      .from("opportunities")
      .select("title")
      .eq("id", result.data.followsId)
      .maybeSingle(),
    (data) =>
      data === null ? null : z.object({ title: z.string() }).parse(data).title,
  );
  // Αν η προηγούμενη δεν φαίνεται ή δεν φόρτωσε, μένει ο σύνδεσμος χωρίς τίτλο: η Ευκαιρία φορτώνει κανονικά.
  const followsTitle = followed.ok ? followed.data : null;
  return { ok: true, data: { ...result.data, followsTitle } };
}

export async function listOpportunityActivities(
  opportunityId: string,
): Promise<ReadResult<ActivityRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listOpportunityActivities",
    supabase
      .from("opportunity_activities")
      .select(ACTIVITY_COLUMNS)
      .eq("opportunity_id", opportunityId)
      .order("occurred_at", { ascending: false }),
    parseActivities,
  );
}
