import type { ReactNode } from "react";

import "../../finance/spaces/money-lines.css";

// Κλειστό κουτί της τελικής όψης (ml-box) για την πλαϊνή στήλη του Ημερολογίου· το <section> κρατά την περιοχή για τα τεστ.
export function SideBox({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <details className="ml-box">
        <summary>
          <h2 className="ml-box-title">{title}</h2>
          {hint && <small>{hint}</small>}
        </summary>
        <div className="a5-box-body">{children}</div>
      </details>
    </section>
  );
}

// Μία απλή γραμμή κειμένου (ml-line) στις λίστες της πλαϊνής στήλης.
export function SideLine({
  title,
  sub,
  aside,
}: {
  title: ReactNode;
  sub?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <li className="ml-line a5-row">
      <span className="a5-lead" />
      <span className="ml-main">
        <span className="a5-plain">{title}</span>
        {sub && <small>{sub}</small>}
      </span>
      <span className="ml-quick">{aside}</span>
    </li>
  );
}
