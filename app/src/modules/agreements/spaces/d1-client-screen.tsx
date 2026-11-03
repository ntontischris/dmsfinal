import Link from "next/link";

import { getViewer } from "@/modules/access";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { agreementCaps } from "../helpers";
import { listClientAgreements } from "../queries-client";
import { clientCardOf, type ClientCardView } from "./client-adapter";

import "./d1.css";

// Τρέχων μήνας και ό,τι απομένει, ίδιο με τη Σήμερα και τη Συμφωνία (το κλεισμένο Γύρισμα κρατά).
function RemainingProvisions({
  current,
}: {
  current: ClientCardView["current"];
}) {
  if (!current) return null;
  return (
    <>
      <dt>Αυτός ο μήνας</dt>
      <dd>{current.label}</dd>
      <dt>Απομένουν</dt>
      <dd>{current.remaining}</dd>
    </>
  );
}

function ClientAgreementCard({ card }: { card: ClientCardView }) {
  return (
    <article className="card">
      <div className="card-title">
        <h2>{card.title}</h2>
        <Badge tone={card.isProposal ? "strong" : undefined}>
          {card.status}
        </Badge>
      </div>
      <dl className="dl">
        <dt>Είδος</dt>
        <dd>{card.kind}</dd>
        {card.amount && (
          <>
            <dt>Ποσό</dt>
            <dd>{card.amount} (χωρίς ΦΠΑ)</dd>
          </>
        )}
        {card.validUntil && (
          <>
            <dt>Ισχύει ως</dt>
            <dd>{card.validUntil}</dd>
          </>
        )}
        <RemainingProvisions current={card.current} />
      </dl>
      <Link
        className="button"
        data-primary={card.isProposal ? "true" : undefined}
        href={card.href}
      >
        {card.cta}
      </Link>
    </article>
  );
}

// D1 Συμφωνίες του Χρήστη πελάτη στη νέα εμφάνιση (prototype `screens/D1.tsx` ClientView + `d1-client-cards.tsx`):
// κάρτες με τις δικές του Συμφωνίες και τις προτάσεις που του στάλθηκαν, από την client_agreements_view.
export async function SpacesClientAgreements() {
  const viewer = await getViewer();
  if (!agreementCaps(viewer).isClient)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Δεν έχεις πρόσβαση στις Συμφωνίες">
          <p>Τις Συμφωνίες τις βλέπει όποιος «Βλέπει Συμφωνίες».</p>
        </StateNotice>
      </div>
    );
  const found = await listClientAgreements();
  if (!found.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="η λίστα Συμφωνιών" />
      </div>
    );
  return (
    <div data-spaces>
      {found.data.length === 0 ? (
        <StateNotice
          kind="empty"
          title="Δεν έχετε ακόμα Συμφωνία με την ομάδα."
        />
      ) : (
        <div className="d1-cards">
          {found.data.map(clientCardOf).map((card) => (
            <ClientAgreementCard key={card.id} card={card} />
          ))}
        </div>
      )}
    </div>
  );
}
