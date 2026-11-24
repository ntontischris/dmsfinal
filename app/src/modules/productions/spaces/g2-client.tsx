import Link from "next/link";

import {
  G2ClientDeliverables,
  clientCardsOf,
  clientProgressByProduction,
  listClientDeliverables,
} from "@/modules/deliverables";
import { messagesViewOf } from "@/modules/messages";
import type { Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
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
import { ProvisionMeter } from "./g2-sections";
import { G2Box } from "./g2-box";
import { G2Hero } from "./g2-hero";
import { G2Filmings } from "./g2-sections";

// G2 Παραγωγή στην όψη πελάτη (prototype `screens/G2.tsx` με isClient): ό,τι δείχνει η παλιά G2 πελάτη, στη μορφή του
// prototype. Χωρίς Εργασίες, Μέλη, Ίχνος, κόστος και χωρίς ποιος παρέδωσε ή ακύρωσε (εσωτερικά).

const EMPTY_PROGRESS = { total: 0, approved: 0, waitingClient: 0, inWork: 0 };

const REOPEN_NOTE =
  "Αν ζητήσεις αλλαγή που ξανανοίγει ένα Παραδοτέο, η Παραγωγή ξανανοίγει μέχρι να παραδοθεί ξανά. Ένα νέο Παραδοτέο μπαίνει στην Παραγωγή του τρέχοντος μήνα.";

const clientMetaOf = (production: ProductionDetail): string => {
  const { client, agreement, period } = production;
  const parts = [client?.name ?? "—"];
  if (agreement)
    parts.push(agreement.title, period ? periodLabel(period.starts) : "εφάπαξ");
  return parts.join(" · ");
};

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
    <G2Box
      title="Κατάσταση"
      isOpen
      hint={
        <Badge tone={production.state === "cancelled" ? "faded" : "strong"}>
          {STATE_WORDS[production.state]}
        </Badge>
      }
    >
      {production.owner && (
        <dl className="ml-kv">
          <dt>Υπεύθυνος</dt>
          <dd>{`${production.owner.name} (η επαφή σου)`}</dd>
        </dl>
      )}
      <ClientStateBlock production={production} blockers={blockers} />
    </G2Box>
  );
}

// «Τι σου αναλογεί»: οι Παροχές της Περιόδου. Η εφάπαξ δεν έχει Περίοδο (η παλιά όψη το λέει ρητά).
function ClientProvisions({ production }: { production: ProductionDetail }) {
  if (production.isInternal) return null;
  const rows = clientProvisionRowsOf(production.balances);
  return (
    <G2Box
      title="Τι σου αναλογεί"
      hint={
        production.period ? periodLabel(production.period.starts) : "εφάπαξ"
      }
    >
      {!production.period && (
        <p className="ml-empty">Εφάπαξ Παραγωγή: καμία Περίοδος Παροχών.</p>
      )}
      {production.period && rows.length === 0 && (
        <p className="ml-empty">Δεν περιλαμβάνεται κάτι ακόμα.</p>
      )}
      <ul className="g2-provisions">
        {rows.map((row) => (
          <li key={row.kindId}>
            <ProvisionMeter
              label={row.label}
              used={row.used}
              total={row.total}
            />
            <small className="g2-sub">{clientProvisionSub(row)}</small>
          </li>
        ))}
      </ul>
    </G2Box>
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
      <G2Hero
        title={production.title}
        stateWord={STATE_WORDS[production.state]}
        meta={clientMetaOf(production)}
        actions={
          canChat &&
          !production.isInternal && (
            <Link href={hrefOf("J3")}>Άνοιγμα Συνομιλίας</Link>
          )
        }
      />
      <Strip
        stats={clientProductionStats(progress, production.filmings)}
        now={null}
      />
      <div className="ml-stack">
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
      </div>
    </div>
  );
}
