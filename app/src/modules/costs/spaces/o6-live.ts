// O6 (νέα εμφάνιση): η λογική της φόρμας Κόστους ώρας που τρέχει και στον browser. Καθαρό αρχείο χωρίς εξαρτήσεις
// από τον server (μόνο τύποι).

import type { CostMonth } from "@/modules/catalogue";

// Ο μήνας που προσυμπληρώνει τη φόρμα: ο ίδιος αν έχει γραφτεί, αλλιώς αυτός που ισχύει (ο ιδιοκτήτης διορθώνει, δεν ξαναγράφει).
export const basisOf = (
  months: readonly CostMonth[],
  month: string,
  inForce: string | null,
): CostMonth | undefined =>
  months.find((row) => row.month === month) ??
  months.find((row) => row.month === inForce);

// Μόνο για την ένδειξη: «1300,5» ή «1300.5». Τον αυστηρό έλεγχο (π.χ. αμφίσημο «1.300») τον κάνει η αποθήκευση.
const DECIMAL = /^\d+([.,]\d+)?$/;
const numberOf = (text: string): number | null => {
  const value = text.trim();
  return DECIMAL.test(value) ? Number(value.replace(",", ".")) : null;
};

// Ζωντανός υπολογισμός «έξοδα ÷ ώρες» από τα πεδία· null όσο κάποιο δεν είναι αριθμός ή οι ώρες είναι μηδέν.
export const liveHourCost = (
  expensesText: string,
  hoursText: string,
): { expenses: number; hours: number; hourCost: number } | null => {
  const expenses = numberOf(expensesText);
  const hours = numberOf(hoursText);
  if (expenses === null || hours === null || hours <= 0) return null;
  return { expenses, hours, hourCost: expenses / hours };
};

// Το κόμμα είναι ο δεκαδικός του ελληνικού πληκτρολογίου, γι' αυτό τα πεδία είναι κειμένου.
export const decimalText = (value: number | undefined): string =>
  value === undefined ? "" : String(value).replace(".", ",");
