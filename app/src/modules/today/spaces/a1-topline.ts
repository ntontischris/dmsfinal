// Η γραμμή κορυφής της Σήμερα: «Μένουν N · Υ € να μπουν», και η ήσυχη ένδειξη της ομάδας «Η εταιρεία δουλεύει».
// Καθαρές συναρτήσεις: το πλήθος και τα ποσά έρχονται έτοιμα από τη λίστα και από το today_money.

import { wholeEuros } from "./a1-facts";
import { GROUP_OF, type ListGroup } from "./a1-list";

export interface ToplineInput {
  remaining: number;
  overdueCents: number | null;
  toInvoiceCents: number | null;
  // Το today_money φόρτωσε (ο Ρόλος βλέπει ποσά): αλλιώς κανένα ποσό.
  canSeeAmounts: boolean;
}

const COMPANY_GROUP = "company";
const TO_INVOICE_CARD = "to_invoice";

const remainingTextOf = (remaining: number): string =>
  remaining === 1 ? "Μένει 1" : `Μένουν ${remaining}`;

const moneyTextOf = ({
  overdueCents,
  toInvoiceCents,
  canSeeAmounts,
}: ToplineInput): string | null => {
  if (!canSeeAmounts) return null;
  const total = (overdueCents ?? 0) + (toInvoiceCents ?? 0);
  return total > 0 ? `${wholeEuros(total)} να μπουν` : null;
};

export function toplineOf(input: ToplineInput): string {
  if (input.remaining === 0) return "Δεν μένει τίποτα";
  const remaining = remainingTextOf(input.remaining);
  const money = moneyTextOf(input);
  return money ? `${remaining} · ${money}` : remaining;
}

// Το άθροισμα των «Προς τιμολόγηση» γραμμών όπως φαίνονται· null όταν δεν υπάρχουν.
export function toInvoiceCentsOf(groups: readonly ListGroup[]): number | null {
  const amounts = groups
    .flatMap((group) => group.lines)
    .filter((line) => line.cardId === TO_INVOICE_CARD)
    .map((line) => line.row.amountCents ?? 0);
  return amounts.length > 0
    ? amounts.reduce((sum, cents) => sum + cents, 0)
    : null;
}

// Η ομάδα «Η εταιρεία δουλεύει» λείπει (δεν έχει επείγον) αλλά η βάση έδωσε έστω μία από τις κάρτες της.
export function isCompanyQuietOf(
  groups: readonly ListGroup[],
  cardCodes: readonly string[],
): boolean {
  const isShown = groups.some((group) => group.id === COMPANY_GROUP);
  return !isShown && cardCodes.some((code) => GROUP_OF[code] === COMPANY_GROUP);
}
