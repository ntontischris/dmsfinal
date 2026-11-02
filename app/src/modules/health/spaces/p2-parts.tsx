import Link from "next/link";
import type { ReactNode } from "react";

import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { hrefOf } from "@/spaces/data/screens";
import { Badge } from "@/spaces/screens/shared";

import { EXTERNAL, redNote } from "../labels";
import type { P2Job } from "./p2-adapter";

interface CardProps {
  title: string;
  red?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}

export function HealthCard({ title, red, badge, children }: CardProps) {
  return (
    <div className="p2-card" data-red={red ? "true" : undefined}>
      <Panel
        label={title}
        aside={
          <>
            {badge ?? (
              <Badge tone={red ? "attention" : "strong"}>
                {red ? "θέλει προσοχή" : "εντάξει"}
              </Badge>
            )}
          </>
        }
      >
        {children}
      </Panel>
    </div>
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
      badge={
        monitorUrl ? (
          <Badge tone="ok">στημένος</Badge>
        ) : (
          <Badge tone="strong">δεν έχει στηθεί</Badge>
        )
      }
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
      <Link href={hrefOf("P2", { view: "down" })} className="button">
        {EXTERNAL.downTitle}
      </Link>
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
      <RowList>
        {jobs.map((j) => (
          <ListRow
            key={j.id}
            isHighlighted={j.isLate}
            title={j.name}
            sub={
              <>
                {j.sub}
                {j.error && (
                  <>
                    <br />
                    Τελευταίο σφάλμα: {j.error}
                  </>
                )}
              </>
            }
            aside={<Badge tone={j.badge.tone}>{j.badge.label}</Badge>}
          />
        ))}
      </RowList>
      {isRed && <RedNote event={50} />}
    </HealthCard>
  );
}
