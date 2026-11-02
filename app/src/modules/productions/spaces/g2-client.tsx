import {
  G2ClientDeliverables,
  clientCardsOf,
  clientProgressByProduction,
  listClientDeliverables,
} from "@/modules/deliverables";
import { messagesViewOf } from "@/modules/messages";
import type { Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { Segments } from "@/spaces/kit/parts";
import { Badge, ErrorNotice } from "@/spaces/screens/shared";
import { Strip } from "@/spaces/shell/strip";

import { periodLabel } from "../helpers";
import type { ProductionDetail } from "../types";
import { STATE_WORDS } from "./g1-rows";
import {
  clientBlockers,
  clientProductionStats,
  clientProvisionRowsOf,
  clientProvisionSub,
} from "./g2-client-model";
import { athensDay } from "./g2-model";
import { G2Messages } from "./g2-notes";
import { G2Filmings } from "./g2-sections";

// G2 Παραγωγή στην όψη πελάτη (prototype `screens/G2.tsx` με isClient): ό,τι δείχνει η παλιά G2 πελάτη, στη μορφή του
// prototype. Χωρίς Εργασίες, Μέλη, Ίχνος, κόστος και χωρίς ποιος παρέδωσε ή ακύρωσε (εσωτερικά).

const EMPTY_PROGRESS = { total: 0, approved: 0, waitingClient: 0, inWork: 0 };

const REOPEN_NOTE =
  "Αν ζητήσεις αλλαγή που ξανανοίγει ένα Παραδοτέο, η Παραγωγή ξανανοίγει μέχρι να παραδοθεί ξανά. Ένα νέο Παραδοτέο μπαίνει στην Παραγωγή του τρέχοντος μήνα.";

function ClientHeader({ production }: { production: ProductionDetail }) {
  const { client, agreement, period } = production;
  return (
    <header className="g2-header">
      <dl className="dl">
        <dt>Πελάτης</dt>
        <dd>{client?.name ?? "—"}</dd>
        {agreement && (
          <>
            <dt>Συμφωνία</dt>
            <dd>
              {agreement.title} ·{" "}
              {period ? periodLabel(period.starts) : "εφάπαξ"}
            </dd>
          </>
        )}
      </dl>
    </header>
  );
}

function ClientStateBlock({
  production,
  blockers,
}: {
  production: ProductionDetail;
  blockers: readonly string[];
}) {
  if (production.state === "open")
    return (
      <p className="muted">
        Γίνεται παραδομένη μόνη της όταν{" "}
        {blockers.length > 0
          ? `λυθεί αυτό που λείπει: ${blockers.join(", ")}`
          : "ολοκληρωθούν όλα· τώρα δεν λείπει τίποτα"}
        . Η κατάσταση βγαίνει από τα Παραδοτέα και τα Γυρίσματα, δεν
        πληκτρολογείται.
      </p>
    );
  if (production.state === "cancelled")
    return (
      <p className="muted">
        Ακυρώθηκε στις{" "}
        {production.cancelledAt ? athensDay(production.cancelledAt) : "—"}.
      </p>
    );
  return (
    <div className="stack">
      <p className="muted">
        Παραδόθηκε στις{" "}
        {production.deliveredAt ? athensDay(production.deliveredAt) : "—"}.
      </p>
      <p className="note">{REOPEN_NOTE}</p>
    </div>
  );
}

function ClientState({
  production,
  blockers,
}: {
  production: ProductionDetail;
  blockers: readonly string[];
}) {
  return (
    <Panel
      label="Κατάσταση"
      aside={
        <Badge tone={production.state === "cancelled" ? "faded" : "strong"}>
          {STATE_WORDS[production.state]}
        </Badge>
      }
    >
      {production.owner && (
        <dl className="dl">
          <dt>Υπεύθυνος</dt>
          <dd>{`${production.owner.name} (η επαφή σου)`}</dd>
        </dl>
      )}
      <ClientStateBlock production={production} blockers={blockers} />
    </Panel>
  );
}

// «Τι σου αναλογεί»: οι Παροχές της Περιόδου. Η εφάπαξ δεν έχει Περίοδο (η παλιά όψη το λέει ρητά).
function ClientProvisions({ production }: { production: ProductionDetail }) {
  if (production.isInternal) return null;
  const rows = clientProvisionRowsOf(production.balances);
  return (
    <Panel
      label="Τι σου αναλογεί"
      aside={
        production.period ? periodLabel(production.period.starts) : "εφάπαξ"
      }
    >
      {!production.period && (
        <p className="muted">Εφάπαξ Παραγωγή: καμία Περίοδος Παροχών.</p>
      )}
      {production.period && rows.length === 0 && (
        <p className="muted">Δεν περιλαμβάνεται κάτι ακόμα.</p>
      )}
      <ul className="g2-provisions">
        {rows.map((row) => (
          <li key={row.kindId}>
            <Segments label={row.label} used={row.used} total={row.total} />
            <span className="part-sub">{clientProvisionSub(row)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

// Ίδια ανάγνωση Παραδοτέων με την παλιά G2 πελάτη (listClientDeliverables + clientCardsOf).
export async function G2ClientPage({
  production,
  viewer,
}: {
  production: ProductionDetail;
  viewer: Viewer;
}) {
  const view = await listClientDeliverables();
  if (!view.ok) return <ErrorNotice what="η Παραγωγή" />;
  const cards = clientCardsOf(view.data, production.id);
  const progress =
    clientProgressByProduction(cards.all).get(production.id) ?? EMPTY_PROGRESS;
  const canChat = messagesViewOf(viewer) === "client";
  return (
    <div className="g2">
      <header className="page-head">
        <h1>
          {production.title}
          <span className="page-head-dot">.</span>
        </h1>
      </header>
      <Strip
        stats={clientProductionStats(progress, production.filmings)}
        now={null}
      />
      <ClientHeader production={production} />
      <ClientState
        production={production}
        blockers={clientBlockers(progress, production.filmings)}
      />
      <ClientProvisions production={production} />
      <G2Filmings filmings={production.filmings} isClient />
      <G2ClientDeliverables
        awaiting={cards.awaiting}
        deliverables={cards.all}
      />
      <G2Messages
        isInternal={production.isInternal}
        threadHref={canChat ? hrefOf("J3") : null}
      />
    </div>
  );
}
