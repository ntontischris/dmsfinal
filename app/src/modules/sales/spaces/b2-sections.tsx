import Link from "next/link";

import { toAgreementRowView, type AgreementRow } from "@/modules/agreements";
import { Panel } from "@/spaces/kit/panel";
import { hrefOf } from "@/spaces/data/screens";
import { Badge } from "@/spaces/screens/shared";

import type { ListItem } from "../types";
import { ActivityLog, type B2ActivityRow } from "./b2-activity-log";
import { agreementTone, priceText, type B2OpportunityRow } from "./b2-adapter";
import { ClientNewOpportunity } from "./b2-new-opportunity";
import { ItemRows } from "./lane-rows";

// Οι καρτέλες της Σελίδας Πελάτη (prototype `screens/b2-sections.tsx`) με πραγματικά δεδομένα.

export function AgreementsSection({
  agreements,
}: {
  agreements: readonly AgreementRow[];
}) {
  if (agreements.length === 0)
    return (
      <Panel label="Συμφωνίες">
        <p className="muted">
          Καμία Συμφωνία ακόμα. Η πρώτη υπογεγραμμένη πρόταση θα εμφανιστεί εδώ.
        </p>
      </Panel>
    );
  return (
    <Panel label="Συμφωνίες">
      <ItemRows
        items={agreements.map((agreement) => {
          const view = toAgreementRowView(agreement);
          const price = priceText(agreement);
          return {
            id: agreement.id,
            title: agreement.title,
            href: hrefOf("D2", { id: agreement.id }),
            sub: [view.kindLabel, view.timeText, view.discountNote]
              .filter(Boolean)
              .join(" · "),
            aside: (
              <>
                <Badge tone={agreementTone(agreement.state)}>
                  {view.statusLabel}
                </Badge>
                {price !== null ? (
                  <strong className="num">{price}</strong>
                ) : (
                  <span className="muted">
                    Ποσά: μόνο στις δικές σου Συμφωνίες.
                  </span>
                )}
              </>
            ),
          };
        })}
      />
    </Panel>
  );
}

export function OpportunitiesSection({
  client,
  rows,
  canCreate,
}: {
  client: { id: string; name: string };
  rows: readonly B2OpportunityRow[];
  // false = ο Χρήστης δεν ανοίγει νέα Ευκαιρία.
  canCreate: boolean;
}) {
  return (
    <Panel
      label="Ευκαιρίες"
      aside={
        canCreate ? (
          <ClientNewOpportunity clientId={client.id} clientName={client.name} />
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <p className="muted">Καμία Ευκαιρία για αυτόν τον Πελάτη.</p>
      ) : (
        <ItemRows
          items={rows.map((row) => ({
            id: row.id,
            title: row.title,
            href: row.href,
            isHighlighted: row.isForgotten,
            sub: row.sub,
            aside: (
              <>
                <Badge tone={row.tone}>{row.badge}</Badge>
                {row.isForgotten && <Badge tone="attention">Ξεχασμένη</Badge>}
                {row.proposal && (
                  <Link className="button" href={row.proposal.href}>
                    {row.proposal.label}
                  </Link>
                )}
              </>
            ),
          }))}
        />
      )}
    </Panel>
  );
}

export interface B2ProductionRow {
  id: string;
  title: string;
  sub: string;
  state: string;
  isOpen: boolean;
}

// Οι Παραγωγές του Πελάτη. Γυρίσματα και βίντεο ανά Παραγωγή λείπουν: δεν υπάρχει ακόμα συγκεντρωτική ανάγνωση.
export function ProductionsSection({
  rows,
}: {
  rows: readonly B2ProductionRow[];
}) {
  return (
    <Panel label="Παραγωγές">
      {rows.length === 0 ? (
        <p className="muted">Καμία Παραγωγή ακόμα.</p>
      ) : (
        <ItemRows
          items={rows.map((row) => ({
            id: row.id,
            title: row.title,
            href: hrefOf("G2", { id: row.id }),
            sub: row.sub,
            aside: (
              <Badge tone={row.isOpen ? "strong" : undefined}>
                {row.state}
              </Badge>
            ),
          }))}
        />
      )}
      <p>
        <Link href={hrefOf("G1")}>Άνοιγμα στη λίστα Παραγωγών</Link>
      </p>
    </Panel>
  );
}

export function ChatSection({ clientId }: { clientId: string }) {
  return (
    <Panel label="Συνομιλία">
      <p>Η Συνομιλία με τους Χρήστες του Πελάτη.</p>
      <p>
        <Link href={hrefOf("J2", { id: clientId })}>
          Άνοιγμα της Συνομιλίας
        </Link>
      </p>
    </Panel>
  );
}

export function ActivitiesSection({
  clientId,
  rows,
  canLog,
  kinds,
  openOpportunities,
}: {
  clientId: string;
  rows: readonly B2ActivityRow[];
  canLog: boolean;
  kinds: readonly ListItem[];
  openOpportunities: readonly { id: string; title: string }[];
}) {
  return (
    <Panel label="Δραστηριότητες">
      <p className="muted">
        Η Δραστηριότητα γράφεται στον Πελάτη ή σε μία από τις ανοιχτές Ευκαιρίες
        του. Διορθώνεται ή σβήνεται μέσα σε 24 ώρες.
      </p>
      <ActivityLog
        clientId={clientId}
        rows={rows}
        canLog={canLog}
        kinds={kinds}
        openOpportunities={openOpportunities}
      />
    </Panel>
  );
}
