import type { ReactNode } from "react";

import { initialsOf } from "@/spaces/shell/avatar";

import "../../finance/spaces/money-lines.css";

// Η κεφαλίδα της Σελίδας Παραγωγής (μορφή της I8): κατάσταση, τίτλος (το μοναδικό h1), Πελάτης/Συμφωνία και οι
// σύνδεσμοι της Παραγωγής. Ίδια για ομάδα και πελάτη.
export function G2Hero(props: {
  title: string;
  stateWord: string;
  meta: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="ml-hero g2-header">
      <span className="ml-hero-mono" aria-hidden="true">
        {initialsOf(props.title)}
      </span>
      <div>
        <span className="ml-tag">{props.stateWord}</span>
        <h1>{props.title}</h1>
        <p>{props.meta}</p>
      </div>
      {props.actions && <div className="ml-quick">{props.actions}</div>}
    </header>
  );
}
