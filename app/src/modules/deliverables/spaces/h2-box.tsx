import type { ReactNode } from "react";

import { initialsOf } from "@/spaces/shell/avatar";

import "../../finance/spaces/money-lines.css";

// Ένα κουτί της Σελίδας Παραδοτέου (details.ml-box): κλειστό από προεπιλογή, ο τίτλος (h2) και μια μικρή ένδειξη στην κεφαλίδα.
export function H2Box(props: {
  title: string;
  hint?: ReactNode;
  isOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <section>
      <details className="ml-box" open={props.isOpen}>
        <summary>
          <h2 className="ml-box-title">{props.title}</h2>
          {props.hint && <small>{props.hint}</small>}
        </summary>
        <div className="h2-box-body">{props.children}</div>
      </details>
    </section>
  );
}

// Ένας άνθρωπος ως κυκλάκι με αρχικά (.ml-thumb)· το όνομα το ακούει ο αναγνώστης οθόνης και φαίνεται στο hover.
export function H2Person({ name }: { name: string }) {
  return (
    <span className="ml-thumb" role="img" aria-label={name} title={name}>
      {initialsOf(name)}
    </span>
  );
}
