import { headers } from "next/headers";

import { athensToday } from "../helpers";
import {
  getProposalPreview,
  listCatalogueOptions,
  listOutbox,
} from "../queries-agreements";
import type {
  AgreementCaps,
  AgreementDetail,
  CatalogueOption,
  OutboxItem,
  ProposalDocument,
} from "../types";

// Ό,τι χρειάζεται η Σελίδα Συμφωνίας εκτός από τη Συμφωνία· ίδιοι κανόνες με τη σημερινή σελίδα
// (`app/(app)/app/agreements/[agreementId]/page-parts.tsx`), εδώ γιατί το module δεν εισάγει από routes.

export interface D2Extras {
  options: CatalogueOption[];
  lossReasons: { id: string; label: string }[];
  preview: ProposalDocument | null;
  outbox: OutboxItem[];
  isOptionsFailed: boolean;
  isLossReasonsFailed: boolean;
}

export const isInternal = (caps: AgreementCaps): boolean =>
  caps.canDraft || caps.canDeviate;

// Σύνδεσμος και κωδικός φτάνουν στον browser μόνο όταν η ομάδα τα παραδίδει με το χέρι.
const withoutSecrets = (items: readonly OutboxItem[]): OutboxItem[] =>
  items.map((item) => ({ ...item, linkPath: null, code: null }));

// Οι λόγοι απώλειας ζουν στις Πωλήσεις, που εισάγουν τις Συμφωνίες: φορτώνονται αργά, για να μη γίνει κύκλος.
async function listLossReasons() {
  const { listSalesLists } = await import("@/modules/sales");
  return listSalesLists();
}

export async function loadExtras(
  agreement: AgreementDetail,
  caps: AgreementCaps,
): Promise<D2Extras> {
  const { can } = agreement;
  const [options, lists, preview, outbox] = await Promise.all([
    can.edit ? listCatalogueOptions(agreement.id) : null,
    can.closeLost ? listLossReasons() : null,
    can.seeAmounts ? getProposalPreview(agreement.id) : null,
    isInternal(caps) ? listOutbox(agreement.id) : null,
  ]);
  return {
    options: options?.ok ? options.data : [],
    lossReasons: lists?.ok
      ? lists.data.lossReasons
          .filter((reason) => !reason.isRetired)
          .map((reason) => ({ id: reason.id, label: reason.label }))
      : [],
    preview: preview?.ok ? preview.data : null,
    outbox: outbox?.ok
      ? agreement.emailSenderConnected
        ? withoutSecrets(outbox.data)
        : outbox.data
      : [],
    isOptionsFailed: options !== null && !options.ok,
    isLossReasonsFailed: lists !== null && !lists.ok,
  };
}

export async function requestOrigin(): Promise<string> {
  const list = await headers();
  const host =
    list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const proto =
    list.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const DAY_MS = 86_400_000;

// Πόσες μέρες μένουν ως τη Λήξη μιας υπογεγραμμένης ή ενεργής Συμφωνίας (μόνο τον τελευταίο μήνα).
export function daysToExpiry(
  agreement: AgreementDetail,
  today: string,
): number | null {
  if (agreement.state !== "signed" && agreement.state !== "active") return null;
  if (agreement.endOn === null) return null;
  const left = Math.round(
    (Date.parse(`${agreement.endOn}T00:00:00Z`) -
      Date.parse(`${today}T00:00:00Z`)) /
      DAY_MS,
  );
  return left >= 0 && left <= 30 ? left : null;
}

// Πόσες ημερολογιακές μέρες (Europe/Athens) περιμένει Έγκριση η τρέχουσα αναθεώρηση.
export function pendingApprovalDays(agreement: AgreementDetail): number | null {
  if (agreement.path !== "awaiting_approval") return null;
  const asked = agreement.revisions.find(
    (revision) => revision.number === agreement.revision,
  )?.approval?.requestedAt;
  if (!asked) return null;
  const days = Math.round(
    (Date.parse(`${athensToday()}T00:00:00Z`) -
      Date.parse(`${athensToday(new Date(asked))}T00:00:00Z`)) /
      DAY_MS,
  );
  return Math.max(0, days);
}
