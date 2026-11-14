// Σελίδες μιας λίστας (b1): η σελίδα ζει στη διεύθυνση (?page=), ξεκινά από 1. Καθαρές συναρτήσεις.

export interface Page<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
  // Θέση της πρώτης και της τελευταίας γραμμής (από 1)· 0 όταν η λίστα είναι κενή.
  from: number;
  to: number;
}

export const parsePage = (raw: string | string[] | undefined): number => {
  const value = typeof raw === "string" ? Number(raw) : Number.NaN;
  return Number.isInteger(value) && value >= 1 ? value : 1;
};

// Σελίδα πέρα από το τέλος (π.χ. μετά από φίλτρο) δείχνει την τελευταία.
export const pageOf = <T>(
  rows: readonly T[],
  requested: number,
  size: number,
): Page<T> => {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(1, requested), pageCount);
  const start = (page - 1) * size;
  const items = rows.slice(start, start + size);
  return {
    items,
    page,
    pageCount,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + items.length,
  };
};
