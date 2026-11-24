import type { CardNumber, CardNumbers } from "@/spaces/shell/section-numbers";
import { fmtMoney } from "@/spaces/screens/shared";

// Τα στοιχεία από τα οποία βγαίνουν οι αριθμοί των καρτών των Τιμολογίων· null = δεν φόρτωσε ή δεν τα δικαιούται.
export interface FinanceFacts {
  toInvoice: { clients: number; total: number } | null;
  unpaid: { count: number; total: number; overdue: number } | null;
  receipts:
    readonly { receivedOn: string; amount: number; deleted: boolean }[] | null;
  month: string;
}

const toInvoiceCard = (facts: FinanceFacts["toInvoice"]): CardNumber | null =>
  facts && {
    count: String(facts.clients),
    hint:
      facts.clients > 0
        ? // Τ8: ίδιο σύνολο και ίδια λέξη με τη γραμμή κορυφής της Σήμερα· το πλήθος μετρά Πελάτες, όχι Τιμολογητέα.
          `Πελάτες · ${fmtMoney(facts.total)} προς τιμολόγηση (χωρίς ΦΠΑ)`
        : "όλα τιμολογημένα",
  };

const invoicesCard = (facts: FinanceFacts["unpaid"]): CardNumber | null =>
  facts && {
    count: String(facts.count),
    hint:
      facts.count > 0
        ? `${fmtMoney(facts.total)} μας χρωστούν`
        : "κανείς δεν χρωστά",
    isUrgent: facts.overdue > 0,
  };

const receiptsCard = (
  receipts: FinanceFacts["receipts"],
  month: string,
): CardNumber | null => {
  if (!receipts) return null;
  const inMonth = receipts.filter(
    (r) => !r.deleted && r.receivedOn.startsWith(month),
  );
  const total = inMonth.reduce((sum, r) => sum + r.amount, 0);
  return {
    count: String(inMonth.length),
    hint:
      inMonth.length > 0
        ? `${fmtMoney(total)} μπήκαν τον μήνα`
        : "καμία αυτόν τον μήνα",
  };
};

// I1 Πελάτες που περιμένουν τιμολόγηση, I2 απλήρωτα, I4 εισπράξεις του μήνα (month = "YYYY-MM").
export const financeNumbersOf = (facts: FinanceFacts): CardNumbers => {
  const cards: Record<string, CardNumber | null> = {
    I1: toInvoiceCard(facts.toInvoice),
    I2: invoicesCard(facts.unpaid),
    I4: receiptsCard(facts.receipts, facts.month),
  };
  return Object.fromEntries(
    Object.entries(cards).filter(
      (entry): entry is [string, CardNumber] => entry[1] !== null,
    ),
  );
};
