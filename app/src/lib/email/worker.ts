import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { recordEmailLog } from "./log";
import { agreementRowSchema, deliverAgreementRow, type AgreementRow } from "./deliver-agreement";
import { deliverOutboxRow, outboxRowSchema, type OutboxRow } from "./deliver-outbox";

// Ο εργάτης της ουράς (cron κάθε λεπτό και «σκούντημα» μετά από κάθε εγγραφή). Πρώτα η ουρά email_outbox,
// μετά η agreement_outbox: η πρώτη πραγματική αποστολή ανοίγει το flag του παρόχου για τις Συμφωνίες.

const BATCH = 20;

export interface WorkerSummary {
  outbox: number;
  agreement: number;
}

const agreementRowsSchema = z.array(agreementRowSchema);
const outboxIdSchema = z.object({ id: z.string() });
const INVALID_OUTBOX_ROW = "Μη έγκυρη γραμμή ειδοποίησης";

async function processOutbox(admin: SupabaseClient, origin: string): Promise<number> {
  const { data, error } = await admin.rpc("email_outbox_claim", { p_limit: BATCH });
  if (error) return logAndCount("email_outbox_claim", error.message);
  const items: unknown[] = Array.isArray(data) ? data : [];
  for (const item of items) await handleRawOutboxRow(admin, item, origin);
  return items.length;
}

// Μία κακή γραμμή (άγνωστο είδος, λάθος payload) δεν ρίχνει την παρτίδα: κλείνει ως αποτυχημένη, οι άλλες στέλνονται.
async function handleRawOutboxRow(admin: SupabaseClient, item: unknown, origin: string): Promise<void> {
  const parsed = outboxRowSchema.safeParse(item);
  if (parsed.success) return handleOutboxRow(admin, parsed.data, origin);
  console.error("email_outbox_claim", "γραμμή με μη έγκυρο σχήμα");
  const id = outboxIdSchema.safeParse(item);
  if (id.success) await markOutboxDone(admin, id.data.id, false, "", INVALID_OUTBOX_ROW, "");
}

async function markOutboxDone(
  admin: SupabaseClient,
  id: string,
  ok: boolean,
  subject: string,
  error: string,
  providerId: string,
  suppressed = false,
): Promise<void> {
  const { error: doneError } = await admin.rpc("email_outbox_done", {
    p_outbox: id,
    p_ok: ok,
    p_subject: subject,
    p_error: error,
    p_provider_id: providerId,
    p_suppressed: suppressed,
  });
  if (doneError) console.error("email_outbox_done", doneError.message);
}

export async function handleOutboxRow(admin: SupabaseClient, row: OutboxRow, origin: string): Promise<void> {
  const delivery = await deliverOutboxRow(admin, row, origin).catch((error: unknown) => {
    console.error("deliverOutboxRow", error instanceof Error ? error.name : "άγνωστο σφάλμα");
    return null;
  });
  const outcome = delivery?.outcome ?? { status: "failed" as const, providerId: "", error: "Η αποστολή απέτυχε" };
  await markOutboxDone(
    admin,
    row.id,
    outcome.status === "sent",
    delivery?.subject ?? "",
    outcome.error,
    outcome.providerId,
    outcome.status === "suppressed",
  );
}

async function processAgreements(admin: SupabaseClient, origin: string): Promise<number> {
  const { data, error } = await admin.rpc("agreement_outbox_claim", { p_limit: BATCH });
  if (error) return logAndCount("agreement_outbox_claim", error.message);
  const rows = agreementRowsSchema.safeParse(data ?? []);
  if (!rows.success) return logAndCount("agreement_outbox_claim", "σχήμα μη έγκυρο");
  for (const row of rows.data) await handleAgreementRow(admin, row, origin);
  return rows.data.length;
}

export async function handleAgreementRow(admin: SupabaseClient, row: AgreementRow, origin: string): Promise<void> {
  const delivery = await deliverAgreementRow(admin, row, origin).catch((error: unknown) => {
    console.error("deliverAgreementRow", error instanceof Error ? error.name : "άγνωστο σφάλμα");
    return null;
  });
  if (delivery?.status === "skip") return markAgreementDone(admin, row.id, true, "");
  const outcome = delivery?.outcome ?? { status: "failed" as const, providerId: "", error: "Η αποστολή απέτυχε" };
  if (delivery) {
    await recordEmailLog(admin, { kind: row.kind, toEmail: row.to_email, subject: delivery.subject, outcome });
  }
  return markAgreementDone(admin, row.id, outcome.status === "sent" || outcome.status === "suppressed", outcome.error);
}

async function markAgreementDone(admin: SupabaseClient, id: string, ok: boolean, error: string): Promise<void> {
  const { error: doneError } = await admin.rpc("agreement_outbox_done", { p_outbox: id, p_ok: ok, p_error: error });
  if (doneError) console.error("agreement_outbox_done", doneError.message);
}

function logAndCount(where: string, message: string): number {
  console.error(where, message);
  return 0;
}

export async function runOutboxWorker(admin: SupabaseClient, origin: string): Promise<WorkerSummary> {
  const outbox = await processOutbox(admin, origin);
  const agreement = await processAgreements(admin, origin);
  return { outbox, agreement };
}
