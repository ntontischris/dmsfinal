import Link from "next/link";

import { Panel } from "@/spaces/kit/panel";

import { getOffer, getOfferCandidates } from "../queries-offers";
import type { FilmingCard } from "../types";
import { E3ClientOffer, E3OfferForm, E3OfferStatus } from "./e3-guide";
import {
  hasOpenRequest,
  offerLineOf,
  pastWarningOf,
  type Missing,
  type TemplateGap,
} from "./e3-guide-model";
import { queueHref } from "./e2-guide-model";

// Τα κομμάτια των οδηγών στη σελίδα του Γυρίσματος (server): προειδοποίηση ώρας που πέρασε, σύνδεσμος στο αίτημα,
// «Τι δεν μπήκε» από τα Πρότυπα, φόρμα και κατάσταση της πρότασης ωρών, και οι ώρες για τον Πελάτη.

const canAnswer = (card: FilmingCard): boolean =>
  card.viewerCan.approve ||
  card.viewerCan.decideReschedule ||
  card.viewerCan.decideCancel;

// Για την ομάδα: η ώρα πέρασε → προειδοποίηση· υπάρχει αίτημα → «Απάντησε στο αίτημα».
// Μέσα στον οδηγό «Εγκρίνω αιτήματα» η απάντηση είναι ήδη το βήμα του: το κουμπί δεν φαίνεται.
export function E3RequestNote({
  card,
  nowMs,
  isInGuide,
}: {
  card: FilmingCard;
  nowMs: number;
  isInGuide: boolean;
}) {
  if (!canAnswer(card) || !hasOpenRequest(card)) return null;
  const warning = pastWarningOf(card, nowMs);
  if (isInGuide && !warning) return null;
  return (
    <section className="card stack" role="status">
      {warning && <p className="e-warn">{warning}</p>}
      {!isInGuide && (
        <div className="btn-row">
          <Link className="button" href={queueHref(1, card.id)}>
            Απάντησε στο αίτημα
          </Link>
        </div>
      )}
    </section>
  );
}

function MissingList({
  title,
  list,
}: {
  title: string;
  list: readonly Missing[];
}) {
  if (list.length === 0) return null;
  return (
    <>
      <p className="kit-label">{title}</p>
      <ul>
        {list.map((item) => (
          <li key={item.name}>
            <strong>{item.name}</strong>: {item.reason}
          </li>
        ))}
      </ul>
    </>
  );
}

const templatesLine = (gap: TemplateGap): string =>
  `Πρότυπο Συνεργείου: ${gap.crewTemplate ?? "κανένα"} · Πρότυπο Εξοπλισμού: ${gap.equipmentTemplate ?? "κανένα"}`;

// Πάνω από το Συνεργείο, στο βήμα «Ποιοι πάνε και με τι;».
export function E3TemplateGap({ gap }: { gap: TemplateGap }) {
  const isComplete = gap.crew.length === 0 && gap.items.length === 0;
  return (
    <Panel label="Από τα προεπιλεγμένα Πρότυπα">
      <div className="stack">
        <p className="muted">{templatesLine(gap)}</p>
        {isComplete ? (
          <p className="e-info">
            Μπήκαν όλα τα μέλη και τα αντικείμενα των Προτύπων.
          </p>
        ) : (
          <div className="e-warn stack">
            <MissingList title="Δεν μπήκαν στο Συνεργείο" list={gap.crew} />
            <MissingList title="Δεν μπήκαν στον Εξοπλισμό" list={gap.items} />
            <p>Πρόσθεσε άλλον ή άλλο από τα πεδία πιο κάτω.</p>
          </div>
        )}
        {gap.blocked.length > 0 && (
          <p className="note">
            Έχουν ρεπό ή άδεια εκείνη την ώρα: {gap.blocked.join(", ")} (μόνο
            προειδοποίηση).
          </p>
        )}
      </div>
    </Panel>
  );
}

// Για την ομάδα: στο βήμα 2β η φόρμα με τις ελεύθερες ώρες· όποτε υπάρχει πρόταση, τι στάλθηκε και η ανάκληση.
export async function E3TeamOffer({
  card,
  isOfferStep,
}: {
  card: FilmingCard;
  isOfferStep: boolean;
}) {
  if (!card.viewerCan.approve) return null;
  const [offer, candidates] = await Promise.all([
    getOffer(card.id),
    isOfferStep ? getOfferCandidates(card.id) : null,
  ]);
  const current = offer.ok ? offer.data : null;
  return (
    <>
      {candidates?.ok && (
        <E3OfferForm
          filmingId={card.id}
          times={candidates.data.times}
          hours={candidates.data.hours}
        />
      )}
      {candidates && !candidates.ok && (
        <p className="e-warn">Δεν φόρτωσαν οι ελεύθερες ώρες. Δοκίμασε ξανά.</p>
      )}
      {current && (
        <E3OfferStatus
          filmingId={card.id}
          line={offerLineOf(current)}
          times={current.times}
          note={current.note}
        />
      )}
    </>
  );
}

// Για τον Πελάτη: οι ώρες που του προτείναμε, ένα πάτημα κλείνει.
export async function E3ClientOfferPart({ card }: { card: FilmingCard }) {
  const offer = await getOffer(card.id);
  if (!offer.ok || offer.data === null) return null;
  return (
    <E3ClientOffer
      filmingId={card.id}
      times={offer.data.times}
      hours={offer.data.hours}
      note={offer.data.note}
    />
  );
}
