import Link from "next/link";

import { toAgreementRowView, type AgreementRow } from "@/modules/agreements";
import { hrefOf } from "@/spaces/data/screens";
import { Badge } from "@/spaces/screens/shared";

import { agreementTone, priceText, type B2OpportunityRow } from "./b2-adapter";
import { BoxLinks, Line, Lines, initialsOf } from "./b2-box";

// Τα περιεχόμενα των κουτιών της Σελίδας Πελάτη ως γραμμές «Χρημάτων» (ml-line): πλακίδιο, κατάσταση ως ετικέτα,
// όνομα με σύνδεσμο, αχνές λεπτομέρειες, ποσό και γρήγορα κουμπιά. Τα δεδομένα είναι τα ίδια με πριν.

export function AgreementLines({
  agreements,
}: {
  agreements: readonly AgreementRow[];
}) {
  if (agreements.length === 0)
    return (
      <p className="muted">
        Καμία Συμφωνία ακόμα. Η πρώτη υπογεγραμμένη πρόταση θα εμφανιστεί εδώ.
      </p>
    );
  return (
    <Lines label="Συμφωνίες">
      {agreements.map((agreement) => {
        const view = toAgreementRowView(agreement);
        const price = priceText(agreement);
        return (
          <Line
            key={agreement.id}
            mark={initialsOf(agreement.title)}
            tag={
              <Badge tone={agreementTone(agreement.state)}>
                {view.statusLabel}
              </Badge>
            }
            title={agreement.title}
            href={hrefOf("D2", { id: agreement.id })}
            sub={[view.kindLabel, view.timeText, view.discountNote]
              .filter(Boolean)
              .join(" · ")}
            amount={
              price ?? <small>Ποσά: μόνο στις δικές σου Συμφωνίες.</small>
            }
          />
        );
      })}
    </Lines>
  );
}

export function OpportunityLines({
  rows,
  empty,
}: {
  rows: readonly B2OpportunityRow[];
  empty: string;
}) {
  if (rows.length === 0) return <p className="muted">{empty}</p>;
  return (
    <Lines label="Ευκαιρίες">
      {rows.map((row) => (
        <Line
          key={row.id}
          mark={initialsOf(row.title)}
          isUrgent={row.isForgotten}
          tag={
            <>
              <Badge tone={row.tone}>{row.badge}</Badge>
              {row.isForgotten && <Badge tone="attention">Ξεχασμένη</Badge>}
            </>
          }
          title={row.title}
          href={row.href}
          sub={row.sub}
          quick={
            row.proposal ? (
              <Link href={row.proposal.href}>{row.proposal.label}</Link>
            ) : undefined
          }
        />
      ))}
    </Lines>
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
export function ProductionLines({
  rows,
}: {
  rows: readonly B2ProductionRow[];
}) {
  return (
    <>
      {rows.length === 0 ? (
        <p className="muted">Καμία Παραγωγή ακόμα.</p>
      ) : (
        <Lines label="Παραγωγές">
          {rows.map((row) => (
            <Line
              key={row.id}
              mark={initialsOf(row.title)}
              isFaded={!row.isOpen}
              tag={
                <Badge tone={row.isOpen ? "strong" : undefined}>
                  {row.state}
                </Badge>
              }
              title={row.title}
              href={hrefOf("G2", { id: row.id })}
              sub={row.sub}
            />
          ))}
        </Lines>
      )}
      <BoxLinks>
        <Link href={hrefOf("G1")}>Άνοιγμα στη λίστα Παραγωγών</Link>
      </BoxLinks>
    </>
  );
}

export function ChatLink({ clientId }: { clientId: string }) {
  return (
    <>
      <p className="muted">Η Συνομιλία με τους Χρήστες του Πελάτη.</p>
      <BoxLinks>
        <Link href={hrefOf("J2", { id: clientId })}>
          Άνοιγμα της Συνομιλίας
        </Link>
      </BoxLinks>
    </>
  );
}
