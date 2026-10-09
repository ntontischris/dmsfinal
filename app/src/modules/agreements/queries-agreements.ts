import { createSupabase } from "@/lib/supabase/server";

import { read, type ReadResult } from "./read";
import type {
  AgreementDetail,
  AgreementRow,
  ApprovalItem,
  CatalogueOption,
  KindInfo,
  OutboxItem,
  ProposalDocument,
  ProposalSummary,
} from "./types";
import { agreementViewSchema, documentSchema } from "./view-schema";
import {
  agreementRowsSchema,
  approvalRowsSchema,
  kindRowsSchema,
  optionRowsSchema,
  outboxRowsSchema,
  summaryRowsSchema,
} from "./view-schema-parts";

// Ανάγνωση των Συμφωνιών. Όλα περνούν από RPC: οι πίνακες είναι κλειστοί στην εφαρμογή και η βάση επιστρέφει null
// σε τιμές, ώρες και κόστος που ο θεατής δεν δικαιούται να δει (το null δεν είναι μηδέν). Η βάση φιλτράρει, όχι η TypeScript.

// Το φίλτρο Ομάδας (D1) τρέχει στην εφαρμογή: η ανάγνωση πρέπει να τα φέρνει όλα, όχι μόνο τα 100 της προεπιλογής της βάσης.
const LIST_LIMIT = 500;

const KIND_COLUMNS =
  "id, label, label_en, unit, unit_en, sort, revision_limit, retired_at";

export async function listAgreements(
  options: { clientId?: string } = {},
): Promise<ReadResult<AgreementRow[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listAgreements",
    supabase.rpc("agreements_list", {
      p_client: options.clientId ?? null,
      p_limit: LIST_LIMIT,
    }),
    (data) => agreementRowsSchema.parse(data),
  );
}

// null όταν η Συμφωνία δεν υπάρχει ή ο θεατής δεν δικαιούται να τη δει (η βάση δεν τα ξεχωρίζει).
export async function getAgreement(
  agreementId: string,
): Promise<ReadResult<AgreementDetail | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getAgreement",
    supabase.rpc("agreement_view", { p_agreement: agreementId }),
    (data) => (data === null ? null : agreementViewSchema.parse(data)),
  );
}

// null και όταν ο θεατής δεν «Βλέπει ποσά»: το έγγραφο περιέχει τιμές.
export async function getProposalPreview(
  agreementId: string,
): Promise<ReadResult<ProposalDocument | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getProposalPreview",
    supabase.rpc("agreement_document_preview", { p_agreement: agreementId }),
    (data) => (data === null ? null : documentSchema.parse(data)),
  );
}

export async function getProposalSummary(
  opportunityId: string,
): Promise<ReadResult<ProposalSummary | null>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "getProposalSummary",
    supabase.rpc("agreement_for_opportunity", { p_opportunity: opportunityId }),
    (data) => summaryRowsSchema.parse(data)[0] ?? null,
  );
}

export async function listApprovals(): Promise<ReadResult<ApprovalItem[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listApprovals",
    supabase.rpc("agreement_approvals_view"),
    (data) => approvalRowsSchema.parse(data),
  );
}

export async function listOutbox(
  agreementId: string,
): Promise<ReadResult<OutboxItem[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listOutbox",
    supabase.rpc("agreement_outbox_view", { p_agreement: agreementId }),
    (data) => outboxRowsSchema.parse(data),
  );
}

export async function listCatalogueOptions(
  agreementId: string,
): Promise<ReadResult<CatalogueOption[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listCatalogueOptions",
    supabase.rpc("agreement_catalogue_options", { p_agreement: agreementId }),
    (data) => optionRowsSchema.parse(data),
  );
}

// Μαζί με τα αποσυρμένα: το UI φιλτράρει με activeKinds, αλλά τα παλιά στοιχεία πρέπει να βρίσκουν το όνομα του είδους τους.
// Η μόνη άμεση ανάγνωση πίνακα του module: το module δεν εισάγει τον Κατάλογο, αλλά χρειάζεται ετικέτες, μονάδες και Όριο αλλαγών.
export async function listProvisionKinds(): Promise<ReadResult<KindInfo[]>> {
  const supabase = await createSupabase();
  if (!supabase) return { ok: false };
  return read(
    "listProvisionKinds",
    supabase
      .from("provision_kinds")
      .select(KIND_COLUMNS)
      .order("sort")
      .order("id"),
    (data) => kindRowsSchema.parse(data),
  );
}
