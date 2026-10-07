import Link from "next/link";
import type { ReactNode } from "react";

// Γραμμές λίστας (Φως): ένα αντικείμενο ανά γραμμή, ο τίτλος μεγάλος, τα στοιχεία από κάτω, η τιμή δεξιά.

export interface RowItem {
  id: string;
  title: string;
  href?: string;
  meta?: ReactNode;
  aside?: ReactNode;
}

const TITLE =
  "text-[1.05rem] font-medium tracking-tight break-words no-underline";

export function Rows({
  items,
  isNumbered = true,
}: {
  items: readonly RowItem[];
  isNumbered?: boolean;
}) {
  return (
    <ol className="m-0 list-none border-t p-0">
      {items.map((item, index) => (
        <li
          key={item.id}
          className="grid grid-cols-[2rem_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1 border-b py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]"
        >
          <span className="font-mono text-xs text-muted-foreground">
            {isNumbered ? String(index + 1).padStart(2, "0") : ""}
          </span>
          {item.href ? (
            <Link className={`${TITLE} hover:text-primary`} href={item.href}>
              {item.title}
            </Link>
          ) : (
            <span className={TITLE}>{item.title}</span>
          )}
          {item.aside && (
            <div className="col-start-2 grid justify-items-start gap-1 sm:col-start-3 sm:row-span-2 sm:row-start-1 sm:justify-items-end sm:text-right">
              {item.aside}
            </div>
          )}
          {item.meta && (
            <div className="col-start-2 text-sm text-muted-foreground">
              {item.meta}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
