import Link from "next/link";

import { can } from "@/modules/access";
import { SpacesHistoryLink } from "@/modules/audit";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, fmtMoney } from "@/spaces/screens/shared";

import { NO_MANAGER_LABEL } from "../labels";
import { initialsOf } from "./b2-box";
import type { ClientPageCtx } from "./b2-context";
import { ClientDelete } from "./b2-delete";
import { ClientNewOpportunity } from "./b2-new-opportunity";
import { NoteToggle } from "./b2-note";
import { ClientTransfer } from "./b2-transfer";

// Η κεφαλίδα της Σελίδας Πελάτη στο ύφος των «Χρημάτων» (όπως I5/I8): στάδιο, όνομα, πρόταση-σύνοψη, μεγάλο το Επόμενο
// βήμα και αχνά τα νούμερα· δεξιά «Άνοιγμα Ευκαιρίας», «Νέα Ευκαιρία», «Πρόσθεσε σημείωση» και «⋯» (Μεταβίβαση,
// Ιστορικό, Διαγραφή ως κείμενο). Οι ροές τους μένουν ίδιες.

function StagePill({ ctx }: { ctx: ClientPageCtx }) {
  if (ctx.isReadOnly) return <Badge>Μόνο ανάγνωση</Badge>;
  return (
    <span className="b2-stage">
      <Badge tone="strong">{ctx.d.stage}</Badge>
      <details className="b2-why">
        <summary aria-label="Τι σημαίνει το στάδιο">?</summary>
        <p>
          Το στάδιο αλλάζει μόνο του, από τις Ευκαιρίες και τις Συμφωνίες του
          Πελάτη.
        </p>
      </details>
    </span>
  );
}

function MoreMenu({ ctx }: { ctx: ClientPageCtx }) {
  const assignable =
    ctx.caps.canTransfer && ctx.data.assignable?.ok
      ? ctx.data.assignable.data
      : null;
  // Χωρίς καμία ενέργεια το «⋯» δεν φαίνεται (π.χ. Χρήστης μόνο ανάγνωσης).
  const hasHistory = can(ctx.viewer, "audit.view");
  if (assignable === null && !hasHistory && ctx.data.deleteState === null)
    return null;
  return (
    <details className="b2-menu">
      <summary aria-label="Περισσότερες ενέργειες">⋯</summary>
      <div className="b2-menu-body">
        {assignable !== null && (
          <ClientTransfer
            clientId={ctx.client.id}
            currentManagerId={ctx.client.managerId}
            assignable={assignable}
          />
        )}
        <SpacesHistoryLink
          viewer={ctx.viewer}
          entity="clients"
          id={ctx.client.id}
        />
        {ctx.data.deleteState && (
          <div className="b2-delete">
            <ClientDelete
              clientId={ctx.client.id}
              clientName={ctx.client.name}
              block={ctx.data.deleteState.deleteBlock}
            />
          </div>
        )}
      </div>
    </details>
  );
}

export function HeroActions({ ctx }: { ctx: ClientPageCtx }) {
  const canLog = ctx.canEdit && ctx.data.activities !== null;
  return (
    <div className="ml-quick b2-hero-quick">
      {ctx.d.next && (
        <Link
          data-primary="true"
          href={hrefOf("B4", { id: ctx.d.next.opportunityId })}
        >
          Άνοιγμα Ευκαιρίας
        </Link>
      )}
      {ctx.canEdit && ctx.card !== null && (
        <ClientNewOpportunity
          clientId={ctx.client.id}
          clientName={ctx.client.name}
        />
      )}
      {canLog && (
        <NoteToggle
          clientId={ctx.client.id}
          rows={(ctx.data.activities ?? []).slice(0, 3)}
          kinds={ctx.data.lists?.activityKinds ?? []}
          openOpportunities={ctx.d.logOpportunities}
        />
      )}
      <MoreMenu ctx={ctx} />
    </div>
  );
}

// Το ένα μεγάλο στοιχείο: το πιο κοντινό Επόμενο βήμα («Κλήση, 08/01/2099» σε δικό του span).
function NextStepFact({ ctx }: { ctx: ClientPageCtx }) {
  const next = ctx.d.next;
  if (next === null)
    return (
      <p className="ml-hero-amount b2-hero-next" data-open="false">
        <span>Κανένα Επόμενο βήμα</span>
        <small>δεν υπάρχει ανοιχτή Ευκαιρία με ημερομηνία</small>
      </p>
    );
  return (
    <p className="ml-hero-amount b2-hero-next" data-open="true">
      <span>
        {next.step}, <span className="b2-num">{next.due}</span>
      </span>
      <small>
        Επόμενο βήμα · Ευκαιρία «{next.title}» · {next.owner}
        {next.isLate && <span className="b2-rec"> πέρασε</span>}
      </small>
    </p>
  );
}

// Τα «Σε αριθμούς» της παλιάς πλαϊνής στήλης και ο Υπεύθυνος, ως αχνά στοιχεία.
const factsOf = (ctx: ClientPageCtx): string =>
  [
    ctx.isReadOnly
      ? null
      : `Υπεύθυνος: ${ctx.client.managerName ?? NO_MANAGER_LABEL}`,
    ctx.isReadOnly
      ? null
      : `Ανοιχτές Ευκαιρίες: ${ctx.data.opportunities.filter((o) => o.outcome === "open").length}`,
    ctx.data.agreements === null
      ? null
      : `Συμφωνίες: ${ctx.data.agreements.length}`,
    ctx.data.ledger === null
      ? null
      : `Υπόλοιπο: ${fmtMoney(ctx.data.ledger.balance)}`,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

export function ClientHero({ ctx }: { ctx: ClientPageCtx }) {
  return (
    <header className="ml-hero b2-hero">
      <span className="b2-hero-clip" aria-hidden="true">
        <span className="ml-hero-mono">{initialsOf(ctx.client.name)}</span>
      </span>
      <div className="b2-hero-text">
        <StagePill ctx={ctx} />
        <h1>{ctx.client.name}</h1>
        <p className="b2-hero-lead">{ctx.d.lead}</p>
        <NextStepFact ctx={ctx} />
        <p className="b2-hero-facts">{factsOf(ctx)}</p>
      </div>
      <HeroActions ctx={ctx} />
    </header>
  );
}
