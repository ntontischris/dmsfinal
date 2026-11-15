import { listAgreements, type AgreementRow } from "@/modules/agreements";
import { getInvoices, getLedger } from "@/modules/finance";

import { getActivityLookups, listSalesLists } from "../queries-lists";
import {
  getClientDeleteState,
  listClientActivities,
  listClientOpportunities,
} from "../queries-clients";
import {
  getClientRenewalDue,
  listMyClientReminders,
} from "../queries-client-care";
import { listClientOverviews } from "../queries-overview";
import { listAssignableUsers } from "../queries-queue";
import type {
  ClientDeleteState,
  ClientDetail,
  ClientReminder,
  Opportunity,
  SalesCaps,
  SalesLists,
} from "../types";
import {
  toActivityRows,
  type ActivityWho,
  type B2ActivityRow,
} from "./activity-rows";
import type { B2Ledger, B2Tab, B2TabRights } from "./b2-adapter";

// Ό,τι διαβάζει η Σελίδα Πελάτη, μία φορά για όλες τις καρτέλες. Ό,τι δεν φόρτωσε ή δεν δικαιούται ο Χρήστης έρχεται
// null και η αντίστοιχη γραμμή απλώς λείπει.

type LedgerData = Extract<
  Awaited<ReturnType<typeof getLedger>>,
  { ok: true }
>["data"];
export type LedgerEntry = LedgerData["entries"][number];

export interface OverdueInvoice {
  id: string;
  number: string;
  remaining: number;
  dueDate: string | null;
}

export interface Loaded {
  opportunities: Opportunity[];
  agreements: AgreementRow[] | null;
  ledger: (B2Ledger & { hasEntries: boolean }) | null;
  ledgerEntries: LedgerEntry[];
  // false = ο πωλητής βλέπει μόνο την Καρτέλα του δικού του Πελάτη (d11), όχι τις σελίδες των Οικονομικών.
  ledgerFull: boolean;
  // null = δεν υπάρχουν ληξιπρόθεσμα, δεν τα βλέπει ή δεν φόρτωσαν.
  overdueInvoices: OverdueInvoice[] | null;
  nextFilming: string | null;
  lists: SalesLists | null;
  assignable: Awaited<ReturnType<typeof listAssignableUsers>> | null;
  // null = ο Χρήστης δεν «Διαγράφει Πελάτες» ή δεν φόρτωσε.
  deleteState: ClientDeleteState | null;
  // null = ο Χρήστης δεν βλέπει τις Δραστηριότητες ή δεν φόρτωσαν.
  activities: B2ActivityRow[] | null;
  // Η «Ανανέωση» της σχέσης (b7): false και όταν δεν φόρτωσε.
  isRenewalDue: boolean;
  // Οι ανοιχτές «Υπενθύμισέ με» του Χρήστη· null = δεν φόρτωσαν.
  reminders: ClientReminder[] | null;
  failed: string[];
}

export interface LoadInput {
  client: ClientDetail;
  rights: B2TabRights;
  allowed: readonly B2Tab[];
  caps: SalesCaps;
  // Βλέπει όλα τα Οικονομικά (Τιμολόγια, Καρτέλα I5)· αλλιώς μόνο την Καρτέλα στη σελίδα (d11).
  isLedgerFull: boolean;
  who: ActivityWho;
}

const ledgerOf = (data: LedgerData) => ({
  balance: data.balance,
  overdue: data.overdue,
  toInvoice: data.toInvoice?.amount ?? null,
  hasEntries: data.entries.length > 0,
});

// Τα ληξιπρόθεσμα Τιμολόγια με αριθμό: μόνο όταν η Καρτέλα λέει ότι υπάρχουν.
async function loadOverdue(
  clientId: string,
  overdue: number,
): Promise<OverdueInvoice[] | null> {
  if (overdue <= 0) return null;
  const invoices = await getInvoices("overdue");
  if (!invoices.ok) return null;
  return invoices.data.items
    .filter((item) => item.clientId === clientId)
    .map((item) => ({
      id: item.id,
      number: item.number,
      remaining: item.remaining,
      dueDate: item.dueDate,
    }));
}

async function loadActivities(
  clientId: string,
  who: ActivityWho,
): Promise<B2ActivityRow[] | null> {
  const [activities, lookups] = await Promise.all([
    listClientActivities(clientId),
    getActivityLookups(),
  ]);
  if (!activities.ok || !lookups.ok) return null;
  return toActivityRows(activities.data, lookups.data, {
    who,
    showOpportunity: true,
  });
}

export async function loadClient(input: LoadInput): Promise<Loaded> {
  const { client, rights, caps } = input;
  const [
    opportunities,
    agreements,
    ledger,
    overviews,
    lists,
    assignable,
    deleteState,
    activities,
    renewal,
    reminders,
  ] = await Promise.all([
    listClientOpportunities(client.id),
    rights.agreements ? listAgreements({ clientId: client.id }) : null,
    rights.ledger ? getLedger(client.id) : null,
    listClientOverviews([client.id]),
    listSalesLists(),
    caps.canTransfer ? listAssignableUsers() : null,
    caps.canDelete ? getClientDeleteState(client.id) : null,
    input.allowed.includes("activities")
      ? loadActivities(client.id, input.who)
      : null,
    getClientRenewalDue(client.id),
    listMyClientReminders(client.id),
  ]);
  const overview = overviews.ok ? overviews.data[0] : undefined;
  const failed = [
    !opportunities.ok && "οι Ευκαιρίες",
    agreements && !agreements.ok && "οι Συμφωνίες",
    ledger && !ledger.ok && "η Καρτέλα Πελάτη",
    !lists.ok && "τα Στάδια και οι Πηγές",
    deleteState && !deleteState.ok && "η Διαγραφή Πελάτη",
  ].filter((what): what is string => typeof what === "string");
  return {
    opportunities: opportunities.ok ? opportunities.data : [],
    agreements: agreements?.ok ? agreements.data : null,
    ledger: ledger?.ok ? ledgerOf(ledger.data) : null,
    ledgerEntries: ledger?.ok ? ledger.data.entries : [],
    ledgerFull: input.isLedgerFull,
    overdueInvoices:
      ledger?.ok && input.isLedgerFull
        ? await loadOverdue(client.id, ledger.data.overdue)
      : null,
    nextFilming: overview?.nextFilming ?? null,
    lists: lists.ok ? lists.data : null,
    assignable,
    deleteState: deleteState?.ok ? deleteState.data : null,
    activities,
    isRenewalDue: renewal.ok && renewal.data,
    reminders: reminders.ok ? reminders.data : null,
    failed,
  };
}
