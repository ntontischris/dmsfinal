import Link from "next/link";
import type { ReactNode } from "react";

import { toAgreementRowView, type AgreementRow } from "@/modules/agreements";
import { Panel } from "@/spaces/kit/panel";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, fmtMoney } from "@/spaces/screens/shared";

import type { ListItem } from "../types";
import { ActivityLog, type B2ActivityRow } from "./b2-activity-log";
import {
  ATTENTION_LABEL,
  agreementTone,
  priceText,
  type B2Ledger,
  type B2OpportunityRow,
  type B2Tab,
  type SummaryLine,
} from "./b2-adapter";
import { ClientNewOpportunity } from "./b2-new-opportunity";
import { ItemRows } from "./lane-rows";

// Οι καρτέλες της Σελίδας Πελάτη (prototype `screens/b2-sections.tsx`) με πραγματικά δεδομένα.

const tabHref = (clientId: string, tab: B2Tab): string =>
  hrefOf("B2", { id: clientId, tab });

export function DetailsSection({
  clientId,
  lines,
  isPossibleDuplicate,
  extra,
}: {
  clientId: string;
  lines: readonly SummaryLine[];
  isPossibleDuplicate: boolean;
  extra?: ReactNode;
}) {
  return (
    <>
      <Panel label="Σύνοψη">
        {isPossibleDuplicate && (
          <p className="note">
            Σήμα «Πιθανό διπλό».{" "}
            <Link href={hrefOf("B6")}>Άνοιγμα στη Συγχώνευση</Link>
          </p>
        )}
        {lines.length === 0 ? (
          <p className="muted">
            Τίποτα σε εξέλιξη με τον Πελάτη. Τα στοιχεία επικοινωνίας είναι στη
            στήλη δίπλα.
          </p>
        ) : (
          <ItemRows
            items={lines.map((line) => {
              const needsAttention = line.label === ATTENTION_LABEL;
              return {
                id: line.label,
                title: line.label,
                sub: needsAttention ? undefined : line.text,
                isHighlighted: needsAttention,
                aside: (
                  <>
                    {needsAttention && (
                      <Badge tone="attention">{line.text}</Badge>
                    )}
                    <Link href={tabHref(clientId, line.tab)}>Λεπτομέρειες</Link>
                  </>
                ),
              };
            })}
          />
        )}
      </Panel>
      {extra}
    </>
  );
}

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
  sources,
}: {
  client: { id: string; name: string };
  rows: readonly B2OpportunityRow[];
  // null = ο Χρήστης δεν ανοίγει νέα Ευκαιρία.
  sources: readonly ListItem[] | null;
}) {
  return (
    <Panel
      label="Ευκαιρίες"
      aside={
        sources !== null ? (
          <ClientNewOpportunity
            clientId={client.id}
            clientName={client.name}
            sources={sources}
          />
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
        <Link href={hrefOf("G1")}>
          Άνοιγμα στη λίστα Παραγωγών
        </Link>
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

export function LedgerSection({
  clientId,
  ledger,
  hasEntries,
}: {
  clientId: string;
  ledger: B2Ledger;
  hasEntries: boolean;
}) {
  return (
    <Panel label="Καρτέλα Πελάτη">
      <p>
        {hasEntries
          ? `Υπόλοιπο ${fmtMoney(ledger.balance)}, ληξιπρόθεσμα ${fmtMoney(ledger.overdue)}${
              ledger.toInvoice === null
                ? ""
                : `, προς τιμολόγηση ${fmtMoney(ledger.toInvoice)}`
            }.`
          : "Καμία κίνηση ακόμα."}
      </p>
      <p>
        <Link href={hrefOf("I5", { client: clientId })}>
          Άνοιγμα της Καρτέλας Πελάτη
        </Link>
      </p>
    </Panel>
  );
}

// Ενότητα που ανήκει σε άλλο module και μπαίνει ως έχει (π.χ. Χρήστες πελάτη, Τι στάλθηκε).
export function EmbeddedSection({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  const body = <div data-tw>{children}</div>;
  return label ? <Panel label={label}>{body}</Panel> : body;
}

export function ActivitiesSection({
  rows,
  canLog,
  kinds,
  openOpportunities,
}: {
  rows: readonly B2ActivityRow[];
  canLog: boolean;
  kinds: readonly ListItem[];
  openOpportunities: readonly { id: string; title: string }[];
}) {
  return (
    <Panel label="Δραστηριότητες">
      <p className="muted">
        {openOpportunities.length > 0
          ? "Κάθε Δραστηριότητα γράφεται σε μία από τις ανοιχτές Ευκαιρίες του Πελάτη."
          : "Για να καταγράψεις Δραστηριότητα χρειάζεται ανοιχτή Ευκαιρία."}
      </p>
      <ActivityLog
        rows={rows}
        canLog={canLog}
        kinds={kinds}
        openOpportunities={openOpportunities}
      />
    </Panel>
  );
}
