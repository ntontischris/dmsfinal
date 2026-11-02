// Το «έγινε» και το λάθος των ενεργειών του Συνδέσμου (prototype `screens/d5-actions.tsx` › Done).

export function D5Done({ text, extra }: { text: string; extra?: string }) {
  return (
    <div className="d5-done" role="status">
      <p>
        <strong>{text}</strong>
      </p>
      {extra && <p className="muted">{extra}</p>}
    </div>
  );
}

export function D5Message({ text }: { text: string }) {
  return (
    <p className="note" role="alert">
      {text}
    </p>
  );
}
