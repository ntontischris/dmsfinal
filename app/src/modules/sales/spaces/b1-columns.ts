// Κάθε στήλη της λίστας Πελατών και φίλτρο (b1): Πόλη, Υπεύθυνος, Ευκαιρίες, Συμφωνίες, Υπόλοιπο, Τελευταία επαφή.
// Κατάσταση και Πακέτο έχουν ήδη τα δικά τους φίλτρα (b1-filters). Στήλη που ο Χρήστης δεν βλέπει δεν γίνεται φίλτρο.

import type { ColumnFilter, ColumnValue } from "@/spaces/kit/column-filters";

import type { B1Columns, B1Row } from "./b1-adapter";
import { QUIET_DAYS, daysSince } from "./b3-filters";

export const B1_COLUMN_KEYS = [
  "city",
  "owner",
  "opps",
  "agreements",
  "balance",
  "contact",
] as const;

const one = (value: string, label: string): ColumnValue[] => [{ value, label }];

// Ναι/όχι από αριθμό ή σημαία· null (δεν φαίνεται στον Χρήστη) = καμία τιμή.
const yesNo =
  (yes: string, no: string) =>
  (isYes: boolean | null): ColumnValue[] =>
    isYes === null ? [] : isYes ? one("yes", yes) : one("no", no);

const contactOf =
  (today: string) =>
  (row: B1Row): ColumnValue[] => {
    if (row.lastContact === null) return one("none", "Καμία επαφή");
    return daysSince(row.lastContact, today) > QUIET_DAYS
      ? one("old", `Πάνω από ${QUIET_DAYS} μέρες`)
      : one("recent", `Τις τελευταίες ${QUIET_DAYS} μέρες`);
  };

const opps = yesNo("Με ανοιχτή Ευκαιρία", "Χωρίς ανοιχτή Ευκαιρία");
const agreements = yesNo("Με ενεργή Συμφωνία", "Χωρίς ενεργή Συμφωνία");
const balance = yesNo("Χρωστά", "Χωρίς Υπόλοιπο");
const positive = (count: number | null) => (count === null ? null : count > 0);

const contactFilter = (today: string): ColumnFilter<B1Row> => ({
  key: "contact",
  label: "Τελευταία επαφή",
  allLabel: "όλες",
  order: ["recent", "old", "none"],
  valuesOf: contactOf(today),
});

// Οι στήλες-φίλτρα για τον Χρήστη· ο Υπεύθυνος και η Τελευταία επαφή μόνο όταν φαίνονται οι στήλες τους.
export const b1ColumnFilters = (
  today: string,
  { showOwner, showOpportunities }: B1Columns,
): ColumnFilter<B1Row>[] => [
  {
    key: "city",
    label: "Πόλη",
    allLabel: "όλες",
    isSearchable: true,
    valuesOf: (row) => (row.city.trim() === "" ? [] : one(row.city, row.city)),
  },
  ...(showOwner
    ? [
        {
          key: "owner",
          label: "Υπεύθυνος",
          isSearchable: true,
          valuesOf: (row: B1Row) => one(row.owner, row.owner),
        },
      ]
    : []),
  {
    key: "opps",
    label: "Ευκαιρίες",
    valuesOf: (row) => opps(positive(row.openOpportunities)),
  },
  {
    key: "agreements",
    label: "Συμφωνίες",
    allLabel: "όλες",
    valuesOf: (row) => agreements(positive(row.activeAgreements)),
  },
  {
    key: "balance",
    label: "Υπόλοιπο",
    valuesOf: (row) => balance(row.hasBalance),
  },
  ...(showOpportunities ? [contactFilter(today)] : []),
];
