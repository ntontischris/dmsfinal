import { getViewer } from "@/modules/access";
import { SectionNumbers } from "@/spaces/shell/section-numbers";

import { getBillables } from "../billables-queries";
import { financeCaps } from "../caps";
import { getInvoices } from "../invoices-queries";
import { athensToday } from "../money";
import { listReceipts } from "../queries";
import { financeNumbersOf, type FinanceFacts } from "./finance-numbers-model";

// Οι αριθμοί μόνο για όποιον βλέπει ποσά· οι υπόλοιποι βλέπουν τις κάρτες χωρίς αριθμούς.
async function loadFacts(): Promise<FinanceFacts | null> {
  const viewer = await getViewer();
  if (!financeCaps(viewer).canView) return null;
  const [billables, invoices, receipts] = await Promise.all([
    getBillables(),
    getInvoices("unpaid"),
    listReceipts(),
  ]);
  return {
    toInvoice: billables.ok
      ? { clients: billables.data.clients.length, total: billables.data.total }
      : null,
    unpaid: invoices.ok
      ? {
          count: invoices.data.totals.unpaidCount,
          total: invoices.data.totals.unpaid,
          overdue: invoices.data.totals.overdueCount,
        }
      : null,
    receipts: receipts.ok ? receipts.data : null,
    month: athensToday().slice(0, 7),
  };
}

// Οι αριθμοί των καρτών των Τιμολογίων (I1, I2, I4)· το layout τους βάζει σε Suspense, η σελίδα δεν περιμένει.
export async function FinanceNumbers() {
  const facts = await loadFacts();
  return facts ? <SectionNumbers numbers={financeNumbersOf(facts)} /> : null;
}
