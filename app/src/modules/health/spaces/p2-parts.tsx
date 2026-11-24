import Link from "next/link";
import type { ReactNode } from "react";

import { hrefOf } from "@/spaces/data/screens";

import { EXTERNAL, redNote } from "../labels";
import type { P2Job } from "./p2-adapter";

interface CardProps {
  title: string;
  red?: boolean;
  // Η κατάσταση στη γραμμή του κουτιού· αλλιώς «θέλει προσοχή» / «εντάξει».
  status?: string;
  // Ανοιχτό από την αρχή· αλλιώς ανοίγει μόνο όταν κάτι θέλει προσοχή.
  open?: boolean;
  children: ReactNode;
}

// Μία ενότητα της Υγείας: κλειστό κουτί που ανοίγει μόνο του όταν κάτι θέλει προσοχή (τελεία REC).
export function HealthCard({ title, red, status, open, children }: CardProps) {
  return (
    <details
      className="ml-box p2-card"
      data-red={red ? "true" : undefined}
      open={open || red || undefined}
    >
      <summary>
        <h2 className="ml-box-title">{title}</h2>
        <small>{status ?? (red ? "θέλει προσοχή" : "εντάξει")}</small>
      </summary>
      {children}
    </details>
  );
}

// Κάθε κόκκινο στοιχείο λέει ποιο Γεγονός στέλνει και ότι πρασινίζει μόνο του.
export function RedNote({ event }: { event: number }) {
  return <p className="note">{redNote(event)}</p>;
}

// Ο εξωτερικός έλεγχος: αν έχει στηθεί (HEALTH_MONITOR_URL). Διαθεσιμότητα 30 ημερών και τελευταίο περιστατικό
// δεν υπάρχουν στην πρώτη έκδοση· τα βλέπεις στην ίδια την υπηρεσία ελέγχου.
export function ExternalCheckCard({
  monitorUrl,
}: {
  monitorUrl: string | null;
}) {
  return (
    <HealthCard
      title={EXTERNAL.title}
      status={monitorUrl ? "στημένος" : "δεν έχει στηθεί"}
      open={!monitorUrl}
    >
      {monitorUrl ? (
        <p className="muted">
          {EXTERNAL.setUp}{" "}
          <a href={monitorUrl} target="_blank" rel="noreferrer">
            {EXTERNAL.open}
          </a>
        </p>
      ) : (
        <p className="muted" data-testid="external-not-set-up">
          {EXTERNAL.notSetUp}
        </p>
      )}
      <p className="ml-actions">
        <Link href={hrefOf("P2", { view: "down" })}>{EXTERNAL.downTitle}</Link>
      </p>
    </HealthCard>
  );
}

export function JobsCard({
  jobs,
  isRed,
}: {
  jobs: readonly P2Job[];
  isRed: boolean;
}) {
  return (
    <HealthCard title="Προγραμματισμένες εργασίες" red={isRed}>
      <ul className="ml-list">
        {jobs.map((j) => (
          <li key={j.id} className="ml-line">
            <span className="ml-main">
              <strong>{j.name}</strong>
              <small>
                {j.sub}
                {j.error && (
                  <>
                    <br />
                    Τελευταίο σφάλμα: {j.error}
                  </>
                )}
              </small>
            </span>
            <span
              className="ml-tag"
              data-attention={
                j.isLate || j.badge.tone === "attention" || undefined
              }
            >
              {j.badge.label}
            </span>
          </li>
        ))}
      </ul>
      {isRed && <RedNote event={50} />}
    </HealthCard>
  );
}
