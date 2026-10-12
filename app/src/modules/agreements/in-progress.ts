import type { AgreementRow } from "./types";

// «Σε εξέλιξη» (η κάρτα «Προτάσεις σε εξέλιξη» της Σήμερα): πρόταση που στάλθηκε και ισχύει, και λήγει σε έως 7 μέρες
// ή την άνοιξε ο πελάτης. Ίδιος κανόνας με το authz.today_proposal_rows της βάσης.

export const IN_PROGRESS_DAYS = 7;

// Μια μέρα YYYY-MM-DD συν n μέρες, χωρίς ώρα και ζώνη.
export const plusDays = (day: string, days: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000)
    .toISOString()
    .slice(0, 10);

export const isInProgress = (
  row: Pick<AgreementRow, "state" | "path" | "validUntil" | "linksOpened">,
  today: string,
): boolean =>
  row.state === "proposal" &&
  row.path === "sent" &&
  (row.validUntil <= plusDays(today, IN_PROGRESS_DAYS) || row.linksOpened > 0);
