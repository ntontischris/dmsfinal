import type { ReactNode } from "react";

import { Panel } from "@/spaces/kit/panel";

import { DOC_LABELS } from "../labels-public";
import type { Language, ProposalDocument } from "../types";
import { documentOf, type D5Pair } from "./d5-adapter";
import { ItemRows } from "./lane-rows";

import "./d5.css";

// Το καθαρό έγγραφο που βλέπει ο πελάτης στον Σύνδεσμο πρότασης (prototype `screens/d5-document.tsx` + `d5-sections.tsx`).
// Ποτέ ώρες, κόστος, περιθώριο, Κατάλογος ή Παρέκκλιση: το έγγραφο που έρχεται από τη βάση δεν τα περιέχει καν.
// Οι ενέργειες (υπογραφή, αλλαγές, απόρριψη) μπαίνουν στο υποσέλιδο από τη σελίδα.

function PlainList({ items }: { items: readonly string[] }) {
  return (
    <ul className="d5-plain">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function Pairs({ pairs }: { pairs: readonly D5Pair[] }) {
  return (
    <dl className="dl">
      {pairs.map((pair) => (
        <PairRow key={pair.label} pair={pair} />
      ))}
    </dl>
  );
}

function PairRow({ pair }: { pair: D5Pair }) {
  return (
    <>
      <dt>{pair.isStrong ? <strong>{pair.label}</strong> : pair.label}</dt>
      <dd>{pair.isStrong ? <strong>{pair.value}</strong> : pair.value}</dd>
    </>
  );
}

interface ProposalDocumentProps {
  document: ProposalDocument;
  language: Language;
  // Το υποσέλιδο με τις ενέργειες (ή τίποτα, π.χ. στην εκτύπωση).
  footer?: ReactNode;
}

export function SpacesProposalDocument({
  document,
  language,
  footer,
}: ProposalDocumentProps) {
  const t = DOC_LABELS[language];
  const doc = documentOf(document, language);
  return (
    <article className="d5-doc" lang={language}>
      <header className="card d5-head">
        <div className="d5-brand">{doc.brand}</div>
        <div className="muted">{doc.proposalFor}</div>
        <h1 className="d5-title">{doc.title}</h1>
        <div className="muted">{doc.meta}</div>
      </header>

      <Panel label={t.linesTitle}>
        <ItemRows
          items={doc.lines.map((line) => ({
            id: line.id,
            title: line.title,
            sub: line.sub,
            aside: (
              <>
                <span className="part-sub">{line.quantity}</span>
                <strong className="num">{line.amount}</strong>
              </>
            ),
          }))}
        />
      </Panel>

      {doc.included && (
        <Panel label={doc.included.title}>
          <PlainList items={doc.included.items} />
        </Panel>
      )}

      <Panel label={t.priceTitle}>
        <Pairs pairs={doc.price} />
        {doc.priceNotes.length > 0 && <PlainList items={doc.priceNotes} />}
        {doc.instalments.length > 0 && (
          <>
            <h3>{t.instalments}</h3>
            <PlainList items={doc.instalments} />
          </>
        )}
      </Panel>

      <Panel label={t.termsTitle}>
        <PlainList items={doc.terms} />
        <h3>{t.filmingTitle}</h3>
        <PlainList items={doc.filming} />
        {doc.revisionLimits.length > 0 && (
          <>
            <h3>{t.revisionTitle}</h3>
            <PlainList items={doc.revisionLimits} />
          </>
        )}
      </Panel>

      <footer className="card d5-section stack">
        {footer}
        <div className="d5-legal muted">
          {doc.legal.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </footer>
    </article>
  );
}
