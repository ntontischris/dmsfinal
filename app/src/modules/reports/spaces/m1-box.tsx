import type { ReactNode } from "react";

import "../../finance/spaces/money-lines.css";
import "./m1-lines.css";

// Τα δομικά κομμάτια της εμφάνισης «Χρήματα» στις Αναφορές και στην Εξαγωγή (όπως η I8): κλειστό κουτί με τίτλο και
// υπόδειξη του τι έχει μέσα, και μια σειρά από λίγους αριθμούς (γεγονότα) κάτω από τον τίτλο.

export function Box(props: {
  title: string;
  hint: string;
  isOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <details className="ml-box" open={props.isOpen}>
        <summary>
          <h2 className="ml-box-title">{props.title}</h2>
          <small>{props.hint}</small>
        </summary>
        <div>{props.children}</div>
      </details>
    </section>
  );
}

export interface Fact {
  label: string;
  value: string;
  basis?: string;
}

export function Facts({ items }: { items: readonly Fact[] }) {
  return (
    <dl className="m1-facts">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>
            <strong>{item.value}</strong>
            {item.basis && <small>{item.basis}</small>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// Τα αρχικά ενός ονόματος για το πλακίδιο της γραμμής (όπως η I4).
export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

// «3 Πελάτες», «1 Πελάτης», «κανένας»: η υπόδειξη ενός κουτιού.
export const countHint = (
  count: number,
  words: { one: string; many: string; none: string },
): string =>
  count === 0 ? words.none : `${count} ${count === 1 ? words.one : words.many}`;
