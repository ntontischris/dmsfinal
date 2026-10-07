import type { ReactNode } from "react";

// Ενότητα της σελίδας /kit: τι είναι, πότε το χρησιμοποιείς, από ποια κατεύθυνση ήρθε, και ένα ζωντανό δείγμα.

interface SpecimenProps {
  id: string;
  title: string;
  origin: string;
  when: string;
  children: ReactNode;
}

export function Specimen({ id, title, origin, when, children }: SpecimenProps) {
  return (
    <section className="kit-specimen" id={id} aria-labelledby={`${id}-title`}>
      <header className="kit-specimen-head">
        <h2 id={`${id}-title`}>{title}</h2>
        <span className="kit-label">{origin}</span>
      </header>
      <p className="muted kit-specimen-when">{when}</p>
      <div className="kit-specimen-demo">{children}</div>
    </section>
  );
}

export interface Swatch {
  token: string;
  name: string;
  use: string;
}

export function Swatches({ items }: { items: readonly Swatch[] }) {
  return (
    <ul className="kit-swatches">
      {items.map((item) => (
        <li key={item.token}>
          <span
            className="kit-swatch"
            style={{ background: `var(${item.token})` }}
          />
          <span>
            <strong>{item.name}</strong>
            <br />
            <code>{item.token}</code>
            <br />
            <span className="muted">{item.use}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
