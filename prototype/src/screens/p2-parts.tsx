import Link from "next/link";
import type { ReactNode } from "react";

import { EXTERNAL_CHECK, JOBS } from "@/data/health";
import type { RoleId } from "@/data/roles";
import { fmtDateTime } from "@/screens/n5-integrations";
import { Badge, screenHref, type ScreenQuery } from "@/screens/shared";

interface CardProps {
  title: string;
  red?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}

export function HealthCard({ title, red, badge, children }: CardProps) {
  return (
    <section className="card p2-card" data-red={red ? "true" : undefined}>
      <div className="card-title">
        <h2>{title}</h2>
        {badge ?? (
          <Badge tone={red ? "attention" : "strong"}>
            {red ? "θέλει προσοχή" : "εντάξει"}
          </Badge>
        )}
      </div>
      {children}
    </section>
  );
}

// Κάθε κόκκινο στοιχείο λέει ποιο Γεγονός στέλνει και ότι πρασινίζει μόνο του.
export function RedNote({ event }: { event: number }) {
  return (
    <p className="note">
      Στέλνει Ειδοποίηση και email (Γεγονός {event}). Πρασινίζει μόνο του όταν
      διορθωθεί.
    </p>
  );
}

interface Props {
  role: RoleId;
  query: ScreenQuery;
}

export function ExternalCheckCard({ role, query }: Props) {
  return (
    <HealthCard title="Εξωτερικός έλεγχος">
      <dl>
        <dt className="muted">Διαθεσιμότητα 30 ημερών</dt>
        <dd>{EXTERNAL_CHECK.availability}</dd>
        <dt className="muted">Τελευταίο περιστατικό</dt>
        <dd>
          {EXTERNAL_CHECK.lastIncident.replace(/^(\S+)/, (d) => fmtDateTime(d))}{" "}
          «{EXTERNAL_CHECK.lastIncidentReason}»
        </dd>
      </dl>
      <p className="muted">
        Ο έλεγχος γίνεται από εξωτερική υπηρεσία, όχι από το DMS. Μετά από 2
        αποτυχημένους ελέγχους (~5 λεπτά) στέλνει η ίδια email σε όσους έχουν
        «Βλέπει Υγεία συστήματος» και στον developer, και άλλο email όταν
        επανέλθει. SMS και push θα έρθουν μετά την πρώτη έκδοση.
      </p>
      <Link
        href={screenHref(role, "P2", { ...query, view: "down" })}
        className="button"
      >
        Τι γίνεται όταν δεν απαντά
      </Link>
    </HealthCard>
  );
}

export function JobsCard() {
  const failed = JOBS.filter((j) => j.failed);
  return (
    <HealthCard title="Προγραμματισμένες εργασίες" red={failed.length > 0}>
      <div className="scroll">
        <table className="rtable">
          <thead>
            <tr>
              <th>Εργασία</th>
              <th>Τελευταία εκτέλεση</th>
              <th>Επόμενη εκτέλεση</th>
              <th>Κατάσταση</th>
            </tr>
          </thead>
          <tbody>
            {JOBS.map((j) => (
              <tr key={j.id}>
                <td data-label="Εργασία">{j.name}</td>
                <td data-label="Τελευταία εκτέλεση">
                  {fmtDateTime(j.lastRun)}
                </td>
                <td data-label="Επόμενη εκτέλεση">{fmtDateTime(j.nextRun)}</td>
                <td data-label="Κατάσταση">
                  {j.failed ? (
                    <Badge tone="attention">δεν έτρεξε</Badge>
                  ) : (
                    <Badge>έτρεξε</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {failed.length > 0 && <RedNote event={50} />}
    </HealthCard>
  );
}
