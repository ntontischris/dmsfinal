"use client";

import { fmtMoney } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { CategoryCard, type CategoryProps } from "./i6-category";
import { categoryTotal, type CategoryDraft } from "./i6-model";

// Μία κατηγορία Εξόδων ως γραμμή των «Χρημάτων» (ml-line): όνομα, πόσα έξοδα, σύνολο και «Αλλαγή». Ανοίγει μέσα στη λίστα
// τον επεξεργαστή της (έξοδα, γραμμές, προσθήκη και αφαίρεση). Κλειστή εξ αρχής· μια νέα κατηγορία ανοίγει μόνη της.

interface RowProps extends CategoryProps {
  isNew: boolean;
}

const countText = (n: number): string =>
  n === 0 ? "χωρίς έξοδα" : n === 1 ? "1 έξοδο" : `${n} έξοδα`;

const itemsText = (cat: CategoryDraft): string =>
  cat.items
    .map((item) => item.name)
    .filter(Boolean)
    .join(" · ");

export function CategoryRow({ isNew, ...props }: RowProps) {
  const { cat, editable } = props;
  return (
    <li>
      <details className="ml-item" open={isNew || undefined}>
        <summary className="ml-line">
          <span className="ml-thumb" aria-hidden="true">
            {initialsOf(cat.name) || "—"}
          </span>
          <span className="ml-main">
            <span className="ml-tag">{countText(cat.items.length)}</span>
            <strong>{cat.name || "Χωρίς όνομα"}</strong>
            <small>{itemsText(cat)}</small>
          </span>
          <span className="ml-amount">{fmtMoney(categoryTotal(cat))}</span>
          <span className="ml-quick">
            <span className="i6-open">{editable ? "Αλλαγή" : "Ανάλυση"}</span>
          </span>
        </summary>
        <div className="ml-page">
          <CategoryCard {...props} />
        </div>
      </details>
    </li>
  );
}
