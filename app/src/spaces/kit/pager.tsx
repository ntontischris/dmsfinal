import Link from "next/link";

import type { Page } from "./pager-model";

// Πλοήγηση σελίδων κάτω από μια λίστα: «‹ Προηγούμενη · 51–100 από 230 · Επόμενη ›». Μία σελίδα = τίποτα.
export function Pager({
  page,
  hrefOf,
}: {
  page: Omit<Page<unknown>, "items">;
  hrefOf: (page: number) => string;
}) {
  if (page.pageCount <= 1) return null;
  return (
    <nav className="btn-row" aria-label="Σελίδες">
      {page.page > 1 && (
        <Link className="button" href={hrefOf(page.page - 1)}>
          ‹ Προηγούμενη
        </Link>
      )}
      <span className="muted">
        {page.from}–{page.to} από {page.total} · Σελίδα {page.page} από{" "}
        {page.pageCount}
      </span>
      {page.page < page.pageCount && (
        <Link className="button" href={hrefOf(page.page + 1)}>
          Επόμενη ›
        </Link>
      )}
    </nav>
  );
}
