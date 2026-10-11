import { formatMoney } from "./billables-helpers";

// Καθαρές συναρτήσεις της Καρτέλας (I5): ετικέτα υπολοίπου, διευθύνσεις και μορφή ποσών.
// Θετικό υπόλοιπο = χρωστά ο Πελάτης· αρνητικό = υπέρ του πελάτη.

export const LEDGER_PATH = "/app/finance/ledger";

export const ledgerHref = (clientId?: string): string =>
  clientId
    ? `${LEDGER_PATH}?client=${encodeURIComponent(clientId)}`
    : LEDGER_PATH;

export const isInFavour = (balance: number): boolean => balance < 0;

export const balanceLabel = (balance: number, isClient: boolean): string => {
  const inFavour = isInFavour(balance);
  if (isClient) return inFavour ? "Υπόλοιπο υπέρ σου" : "Υπόλοιπο (χρωστάς)";
  return inFavour ? "Υπόλοιπο υπέρ του πελάτη" : "Υπόλοιπο (χρωστά)";
};

// Το υπόλοιπο δείχνεται πάντα θετικό· η ετικέτα λέει προς τα πού πάει.
export const balanceText = (balance: number): string =>
  formatMoney(Math.abs(balance));

export const moneyOrDash = (value: number): string =>
  value === 0 ? "—" : formatMoney(value);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const clientParam = (value: string | undefined): string | undefined =>
  value && UUID.test(value) ? value : undefined;
