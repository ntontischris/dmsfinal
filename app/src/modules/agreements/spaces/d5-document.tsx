import type { ReactNode } from "react";

import { DOC_LABELS } from "../labels-public";
import type { Language, ProposalDocument } from "../types";
import { documentOf, type D5Pair } from "./d5-adapter";

import "../../finance/spaces/money-lines.css";
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
    <dl className="ml-kv">
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

// Μία ενότητα του εγγράφου: ανοιχτό κουτί (το έγγραφο διαβάζεται ολόκληρο και τυπώνεται), τίτλος h2 ή h3 μέσα σε άλλη σελίδα.
function Part({
  title,
  isEmbedded,
  children,
}: {
  title: string;
  isEmbedded: boolean;
  children: ReactNode;
}) {
  const Title = isEmbedded ? "h3" : "h2";
  return (
    <section className="ml-box d5-part">
      <Title className="ml-box-title">{title}</Title>
      {children}
    </section>
  );
}

interface ProposalDocumentProps {
  document: ProposalDocument;
  language: Language;
  // Το υποσέλιδο με τις ενέργειες (ή τίποτα, π.χ. στην εκτύπωση).
  footer?: ReactNode;
  // Μέσα σε άλλη σελίδα (Σελίδα Συμφωνίας): ο τίτλος δεν είναι h1, γιατί η σελίδα έχει ήδη το δικό της.
  isEmbedded?: boolean;
}

export function SpacesProposalDocument({
  document,
  language,
  footer,
  isEmbedded = false,
}: ProposalDocumentProps) {
  const t = DOC_LABELS[language];
  const doc = documentOf(document, language);
  const DocTitle = isEmbedded ? "p" : "h1";
  const SubTitle = isEmbedded ? "h4" : "h3";
  const part = { isEmbedded };
  return (
    <article className="d5-doc" lang={language}>
      <header className="ml-hero d5-head">
        <div>
          <span className="d5-brand">{doc.brand}</span>
          <p>{doc.proposalFor}</p>
          <DocTitle className="d5-title">{doc.title}</DocTitle>
          <p>{doc.meta}</p>
        </div>
      </header>

      <Part title={t.linesTitle} {...part}>
        <ul className="ml-list d5-lines">
          {doc.lines.map((line) => (
            <li key={line.id} className="ml-line">
              <span className="ml-main">
                <strong>{line.title}</strong>
                {line.sub && <small>{line.sub}</small>}
              </span>
              <span className="ml-amount">
                {line.amount}
                <small>{line.quantity}</small>
              </span>
            </li>
          ))}
        </ul>
      </Part>

      {doc.included && (
        <Part title={doc.included.title} {...part}>
          <PlainList items={doc.included.items} />
        </Part>
      )}

      <Part title={t.priceTitle} {...part}>
        <Pairs pairs={doc.price} />
        {doc.priceNotes.length > 0 && <PlainList items={doc.priceNotes} />}
        {doc.instalments.length > 0 && (
          <>
            <SubTitle>{t.instalments}</SubTitle>
            <PlainList items={doc.instalments} />
          </>
        )}
      </Part>

      <Part title={t.termsTitle} {...part}>
        <PlainList items={doc.terms} />
        <SubTitle>{t.filmingTitle}</SubTitle>
        <PlainList items={doc.filming} />
        {doc.revisionLimits.length > 0 && (
          <>
            <SubTitle>{t.revisionTitle}</SubTitle>
            <PlainList items={doc.revisionLimits} />
          </>
        )}
      </Part>

      <footer className="ml-box d5-section stack">
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
