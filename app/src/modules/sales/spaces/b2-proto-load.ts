// PROTOTYPE — throwaway, three variants of the Client page via ?variant=.
// Ό,τι χρειάζονται οι παραλλαγές πάνω από τη φόρτωση της σημερινής σελίδας: οι Δραστηριότητες (για «τελευταία» και
// «Καταγραφή» χωρίς καρτέλα), οι κινήσεις της Καρτέλας (Α: μέσα στη σελίδα) και τα ληξιπρόθεσμα Τιμολόγια (Β: με όνομα).
// Μόνο ανάγνωση· ό,τι δεν φορτώνει απλώς λείπει.

import { getInvoices, getLedger } from "@/modules/finance";

import { getActivityLookups } from "../queries-lists";
import { listClientActivities } from "../queries-clients";
import {
  toActivityRows,
  type ActivityWho,
  type B2ActivityRow,
} from "./activity-rows";

type LedgerEntries = Extract<
  Awaited<ReturnType<typeof getLedger>>,
  { ok: true }
>["data"]["entries"];

export interface OverdueInvoice {
  id: string;
  number: string;
  remaining: number;
  dueDate: string | null;
}

export interface ProtoData {
  activities: B2ActivityRow[] | null;
  ledgerEntries: LedgerEntries | null;
  overdueInvoices: OverdueInvoice[] | null;
}

export async function loadProto(input: {
  clientId: string;
  canSeeLedger: boolean;
  hasOverdue: boolean;
  who: ActivityWho;
}): Promise<ProtoData> {
  const [activities, lookups, ledger, invoices] = await Promise.all([
    listClientActivities(input.clientId),
    getActivityLookups(),
    input.canSeeLedger ? getLedger(input.clientId) : null,
    input.canSeeLedger && input.hasOverdue ? getInvoices("overdue") : null,
  ]);
  return {
    activities:
      activities.ok && lookups.ok
        ? toActivityRows(activities.data, lookups.data, {
            who: input.who,
            showOpportunity: true,
          })
        : null,
    ledgerEntries: ledger?.ok ? ledger.data.entries : null,
    overdueInvoices: invoices?.ok
      ? invoices.data.items
          .filter((item) => item.clientId === input.clientId)
          .map((item) => ({
            id: item.id,
            number: item.number,
            remaining: item.remaining,
            dueDate: item.dueDate,
          }))
      : null,
  };
}
