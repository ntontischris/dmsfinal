import { can } from "@/modules/access";
import { SpacesHistoryLink } from "@/modules/audit";
import { Badge } from "@/spaces/screens/shared";

import { NO_MANAGER_LABEL } from "../labels";
import { RelationshipSteps } from "./b2-briefing";
import type { ClientPageCtx } from "./b2-context";
import { ClientDelete } from "./b2-delete";
import { ClientNewOpportunity } from "./b2-new-opportunity";
import { NoteToggle } from "./b2-note";
import { ClientTransfer } from "./b2-transfer";

// Η κεφαλίδα της Σελίδας Πελάτη: όνομα με ένα στάδιο, Υπεύθυνος, βηματόμετρο, «Νέα Ευκαιρία», «Πρόσθεσε σημείωση»
// και «⋯» με Μεταβίβαση, Ιστορικό και Διαγραφή (τελευταία, ως κείμενο). Οι ροές τους μένουν ίδιες.

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

function HeaderActions({ ctx }: { ctx: ClientPageCtx }) {
  const canLog = ctx.canEdit && ctx.data.activities !== null;
  return (
    <span className="b2-title-actions">
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
    </span>
  );
}

export function ClientHeader({ ctx }: { ctx: ClientPageCtx }) {
  return (
    <header className="b2-head">
      <div className="b2-title">
        <h1>{ctx.client.name}</h1>
        <StagePill ctx={ctx} />
        <HeaderActions ctx={ctx} />
      </div>
      {!ctx.isReadOnly && (
        <p className="muted b2-line">
          Υπεύθυνος: {ctx.client.managerName ?? NO_MANAGER_LABEL}
        </p>
      )}
      <RelationshipSteps ctx={ctx} />
    </header>
  );
}
