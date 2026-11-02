import type { ReactNode } from "react";

// Πλαϊνή στήλη ιδιοτήτων (πάνελ «Πληροφορίες κλιπ» του Μοντάζ): ταυτότητα ενός αντικειμένου με μια ματιά.
// Δίπλα στο κύριο περιεχόμενο σε desktop, από πάνω του σε κινητό.

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
    <aside className="kit-inspector" aria-label={title}>
      {code && <p className="kit-inspector-code">{code}</p>}
      <h2 className="kit-inspector-title">{title}</h2>
      <dl className="dl">
        {fields.map((field) => (
          <div key={field.label} style={{ display: "contents" }}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
      {children && <div className="kit-inspector-foot">{children}</div>}
    </aside>
  );
}

interface SplitProps {
  side?: "start" | "end";
  children: ReactNode;
}

// Διάταξη «περιεχόμενο + πλαϊνή στήλη». Τα παιδιά μπαίνουν με τη σειρά που θα διαβαστούν σε κινητό.
export function Split({ side = "end", children }: SplitProps) {
  return (
    <div className="kit-split" data-side={side}>
      {children}
    </div>
  );
}
