import Link from "next/link";
import type { ReactNode } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { Steps } from "@/spaces/kit/steps";
import { ErrorNotice } from "@/spaces/screens/shared";

import type { ClientPageCtx } from "./b2-context";
import { FROM_OLD_TAB, type ClientTab } from "./b2-page-model";

// Η κορυφή-ενημέρωση της Σελίδας Πελάτη, στο ύφος της «Σήμερα»: πάνελ με τίτλο και εικονίδιο σε κύκλο, πρόταση-σύνοψη,
// βηματόμετρο 3 βημάτων, «Χρειάζεται προσοχή» και «Επόμενο βήμα».

export type BriefPart =
  "attention" | "next" | "relation" | "money" | "log" | "facts";

export const clientTabHref = (clientId: string, tab: ClientTab): string =>
  hrefOf("B2", { id: clientId, tab: tab === "overview" ? undefined : tab });

export function BriefPanel({
  part,
  label,
  aside,
  children,
}: {
  part: BriefPart;
  label: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="b2-panel" data-part={part}>
      <Panel label={label} aside={aside}>
        {children}
      </Panel>
    </div>
  );
}

// Ο τίτλος φαίνεται (όχι μόνο aria-label), για να βρίσκεται η γραμμή στη σελίδα.
export function RelationshipSteps({ ctx }: { ctx: ClientPageCtx }) {
  if (ctx.isReadOnly) return null;
  return (
    <section className="b2-relationship">
      <h2>Σχέση με τον Πελάτη</h2>
      <Steps label="Σχέση με τον Πελάτη" steps={ctx.d.steps} />
    </section>
  );
}

export const ClientLead = ({ ctx }: { ctx: ClientPageCtx }) => (
  <p className="b2-lead">{ctx.d.lead}</p>
);

// Πρόσβαση μέσω Ευκαιρίας, σήμα «Πιθανό διπλό» και ό,τι δεν φόρτωσε.
export function ClientNotices({ ctx }: { ctx: ClientPageCtx }) {
  const isDuplicate =
    (ctx.card?.isPossibleDuplicate ?? false) && ctx.caps.canMerge;
  return (
    <>
      {ctx.grantedVia && (
        <p className="note">
          Πρόσβαση μέσω της Ευκαιρίας σου «{ctx.grantedVia.title}» · Υπεύθυνος
          Πελάτη: {ctx.client.managerName ?? "—"}
        </p>
      )}
      {isDuplicate && (
        <p className="note">
          Σήμα «Πιθανό διπλό».{" "}
          <Link href={hrefOf("B6")}>Άνοιγμα στη Συγχώνευση</Link>
        </p>
      )}
      {ctx.data.failed.length > 0 && (
        <ErrorNotice what={ctx.data.failed.join(", ")} />
      )}
    </>
  );
}

// Μόνο όταν υπάρχει κίνδυνος· η κόκκινη τελεία είναι μόνο στο εικονίδιο.
export function AttentionPanel({ ctx }: { ctx: ClientPageCtx }) {
  const line = ctx.d.attention;
  if (!line) return null;
  return (
    <BriefPanel part="attention" label="Χρειάζεται προσοχή">
      <p className="b2-line">{line.text}</p>
      <footer className="b2-foot">
        <Link href={clientTabHref(ctx.client.id, FROM_OLD_TAB[line.tab])}>
          Λεπτομέρειες →
        </Link>
      </footer>
    </BriefPanel>
  );
}

export function NextStepPanel({ ctx }: { ctx: ClientPageCtx }) {
  const next = ctx.d.next;
  return (
    <BriefPanel part="next" label="Επόμενο βήμα">
      {next === null ? (
        <p className="muted b2-line">
          Κανένα Επόμενο βήμα: δεν υπάρχει ανοιχτή Ευκαιρία με ημερομηνία.
        </p>
      ) : (
        <>
          <p className="b2-big">
            {next.step}, <span className="b2-num">{next.due}</span>
            {next.isLate && <span className="b2-rec"> πέρασε</span>}
          </p>
          <p className="muted b2-line">
            Ευκαιρία «{next.title}» · {next.owner}
          </p>
          <footer className="b2-foot">
            <Link
              className="button"
              data-primary="true"
              href={hrefOf("B4", { id: next.opportunityId })}
            >
              Άνοιγμα Ευκαιρίας
            </Link>
          </footer>
        </>
      )}
    </BriefPanel>
  );
}
