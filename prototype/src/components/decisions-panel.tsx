import { decisionsFor } from '@/data/decisions';

interface DecisionsPanelProps {
  code: string;
  isFinal: boolean;
}

// Μόνο ανάγνωση. Η απόφαση ζει στο Blueprint· όταν γραφτεί εκεί, το ερώτημα σβήνεται.
export function DecisionsPanel({ code, isFinal }: DecisionsPanelProps) {
  const decisions = decisionsFor(code);

  return (
    <aside className="card decisions" aria-labelledby={`decisions-${code}`}>
      <div className="decisions-title">
        <h2 id={`decisions-${code}`}>Αποφάσεις εδώ</h2>
        <span className="muted">{decisions.length} ανοιχτές</span>
      </div>
      {decisions.length === 0 && (
        <p className="muted">
          {isFinal
            ? 'Καμία ανοιχτή απόφαση. Η οθόνη είναι τελική.'
            : 'Δεν έχουν καταγραφεί ακόμα ερωτήματα. Τα συμπληρώνει το ticket του module.'}
        </p>
      )}
      {decisions.map((decision) => (
        <div key={decision.id} className="decision">
          <p>{decision.question}</p>
          {decision.options.length > 0 && (
            <ul>
              {decision.options.map((option) => (
                <li key={option}>{option}</li>
              ))}
            </ul>
          )}
          <p className="muted">
            Σύσταση: {decision.recommendation ?? 'θα προταθεί στο ticket του module.'}
          </p>
          <a className="muted" href={decision.source.href} target="_blank" rel="noreferrer">
            {decision.source.label} ↗
          </a>
        </div>
      ))}
    </aside>
  );
}
