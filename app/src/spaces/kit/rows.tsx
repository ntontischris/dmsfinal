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

export function Rows({ items }: { items: readonly RowItem[] }) {
  return (
    <ol className="kit-rows">
      {items.map((item, index) => (
        <li key={item.id} className="kit-row">
          <span className="kit-row-index">
            {String(index + 1).padStart(2, "0")}
          </span>
          {item.href ? (
            <Link className="kit-row-title" href={item.href}>
              {item.title}
            </Link>
          ) : (
            <span className="kit-row-title">{item.title}</span>
          )}
          {item.aside && <div className="kit-row-aside">{item.aside}</div>}
          {item.meta && <div className="kit-row-meta">{item.meta}</div>}
        </li>
      ))}
    </ol>
  );
}
