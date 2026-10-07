import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

// Πλαϊνή στήλη ιδιοτήτων (πάνελ «Πληροφορίες κλιπ» του Μοντάζ): η ταυτότητα ενός αντικειμένου με μια ματιά.
// Στο DOM μπαίνει πρώτη, ώστε σε κινητό να διαβάζεται πρώτη· σε desktop στέκεται δεξιά.

export interface InspectorField {
  label: string;
  value: ReactNode;
}

interface InspectorProps {
  code?: string;
  title: string;
  fields: readonly InspectorField[];
  children?: ReactNode; // ενέργειες, στο κάτω μέρος
}

export function Inspector({ code, title, fields, children }: InspectorProps) {
  return (
    <aside
      aria-label={title}
      className="min-w-0 overflow-hidden rounded-md border bg-card lg:sticky lg:top-16"
    >
      {code && (
        <p className="mx-4 mt-4 mb-1 font-mono text-sm font-medium text-primary">
          {code}
        </p>
      )}
      <h2 className={cn("mx-4 mb-3 text-xl font-medium", !code && "mt-4")}>
        {title}
      </h2>
      <dl className="grid grid-cols-[6.5rem_1fr] gap-x-4 gap-y-2 border-t px-4 py-3 text-sm">
        {fields.map((field) => (
          <div key={field.label} className="contents">
            <dt className="kit-label leading-[1.9] tracking-[0.04em]">
              {field.label}
            </dt>
            <dd className="m-0 min-w-0 break-words tabular-nums">
              {field.value}
            </dd>
          </div>
        ))}
      </dl>
      {children && (
        <div className="grid gap-2 border-t px-4 py-3">{children}</div>
      )}
    </aside>
  );
}

// Διάταξη «πλαϊνή στήλη + περιεχόμενο». Το πρώτο παιδί είναι ο Inspector.
export function Split({ children }: { children: ReactNode }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:[&>aside]:col-start-2 lg:[&>aside]:row-start-1">
      {children}
    </div>
  );
}
