import type { ReactNode } from "react";

import { initialsOf } from "@/spaces/shell/avatar";

// Ένα κουτί της Σελίδας Παραγωγής (μορφή της I8): κλειστό εκτός αν ζητηθεί, ο τίτλος (h2, τον βρίσκουν τα τεστ)
// και μια υπόδειξη για ό,τι έχει μέσα.
export function G2Box(props: {
  title: string;
  hint: ReactNode;
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
        <div className="g2-box-body">{props.children}</div>
      </details>
    </section>
  );
}

// Ένας άνθρωπος ως κυκλάκι με αρχικά (.ml-thumb)· το όνομα το ακούει ο αναγνώστης οθόνης και φαίνεται στο hover.
export function G2Person({ name }: { name: string }) {
  return (
    <span
      className="ml-thumb g2-person"
      role="img"
      aria-label={name}
      title={name}
    >
      {initialsOf(name)}
    </span>
  );
}
