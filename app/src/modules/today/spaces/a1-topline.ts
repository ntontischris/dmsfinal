// Η γραμμή κορυφής της Σήμερα: «Μένουν N · Χ € ληξιπρόθεσμα + Υ € προς τιμολόγηση», και η εταιρεία (ομάδα 7) όταν δεν έχει επείγον.
// Καθαρές συναρτήσεις: το πλήθος και τα ποσά έρχονται έτοιμα από τη λίστα και από το today_money.

import type { Built } from "./a1-adapter";
import { wholeEuros } from "./a1-facts";
import { GROUP_OF, type ListGroup } from "./a1-list";

export interface ToplineInput {
  remaining: number;
  overdueCents: number | null;
  toInvoiceCents: number | null;
  // Το today_money φόρτωσε (ο Ρόλος βλέπει ποσά): αλλιώς κανένα ποσό.
  canSeeAmounts: boolean;
}

// Μία εταιρική κάρτα με πλήθος, που δεν φαίνεται ως γραμμή της ομάδας 7 (μόνο τα επείγοντα μπαίνουν εκεί).
export interface CompanyItem {
  id: string;
  title: string;
  count: number;
  href: string;
}

export interface CompanyState {
  items: readonly CompanyItem[];
  // Όλες οι εταιρικές κάρτες είναι χωρίς πλήθος και η ομάδα 7 λείπει: «Όλα λειτουργούν».
  isClear: boolean;
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
  const parts = [
    overdueCents ? `${wholeEuros(overdueCents)} ληξιπρόθεσμα` : null,
    toInvoiceCents ? `${wholeEuros(toInvoiceCents)} προς τιμολόγηση` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" + ") : null;
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

const isCompanyCard = (item: Built): boolean =>
  GROUP_OF[item.card.id] === COMPANY_GROUP;

// Οι εταιρικές κάρτες με πλήθος που δεν φαίνονται ήδη ως γραμμές ή σφάλματα της ομάδας 7.
const companyItemsOf = (
  built: readonly Built[],
  groups: readonly ListGroup[],
): CompanyItem[] => {
  const company = groups.find((group) => group.id === COMPANY_GROUP);
  const listed = new Set([
    ...(company?.lines.map((line) => line.cardId) ?? []),
    ...(company?.failed ?? []),
  ]);
  return built
    .filter(
      (item) =>
        isCompanyCard(item) &&
        !listed.has(item.card.id) &&
        item.content.count > 0,
    )
    .map(({ card, content }) => ({
      id: card.id,
      title: card.title,
      count: content.count,
      href: content.allHref,
    }));
};

// Η εταιρεία στη σύνοψη της λίστας: όσα θέλουν προσοχή (πλήθος) και, όταν δεν υπάρχει τίποτα, το «Όλα λειτουργούν».
export function companyStateOf(
  built: readonly Built[],
  groups: readonly ListGroup[],
): CompanyState {
  const isShown = groups.some((group) => group.id === COMPANY_GROUP);
  const items = companyItemsOf(built, groups);
  return {
    items,
    isClear: !isShown && items.length === 0 && built.some(isCompanyCard),
  };
}
