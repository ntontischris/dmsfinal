import type { ReactNode } from "react";

// Ένα κλειστό κουτί της G3 (μορφή της I8): ο τίτλος (h2, τον βρίσκουν τα τεστ) και μια υπόδειξη για ό,τι έχει μέσα.
export function G3Box(props: {
  title: string;
  hint: ReactNode;
  isOpen?: boolean;
  isNew?: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <details
        className={props.isNew ? "ml-box ml-new" : "ml-box"}
        open={props.isOpen}
      >
        <summary>
          <h2 className="ml-box-title">{props.title}</h2>
          <small>{props.hint}</small>
        </summary>
        <div>{props.children}</div>
      </details>
    </section>
  );
}
