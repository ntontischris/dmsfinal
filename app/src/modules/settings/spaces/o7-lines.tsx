import Link from "next/link";

import { setReadinessConfirmation } from "../actions";
import type { LineView } from "./o7-adapter";
import { ActionButton } from "./o-form";

// Οι γραμμές του Ελέγχου ετοιμότητας (prototype `screens/o7-lines.tsx`), από τη βάση. Επιβεβαιώνει μόνο ο Ιδιοκτήτης.

function ConfirmButton({
  line,
  isOwner,
}: {
  line: LineView;
  isOwner: boolean;
}) {
  if (isOwner)
    return (
      <ActionButton
        action={setReadinessConfirmation}
        fields={{ item: line.id, confirmed: line.done ? "false" : "true" }}
        label={line.done ? "Αναίρεση" : "Επιβεβαίωση"}
      />
    );
  if (line.done) return null;
  return (
    <>
      <button type="button" disabled>
        Επιβεβαίωση
      </button>
      <small>Επιβεβαιώνει ο Ιδιοκτήτης</small>
    </>
  );
}

interface ActionProps {
  line: LineView;
  isOwner: boolean;
  isLocked: boolean;
}

function LineAction({ line, isOwner, isLocked }: ActionProps) {
  if (isLocked) return null;
  if (line.isManual) return <ConfirmButton line={line} isOwner={isOwner} />;
  if (line.done) return null;
  if (line.comesWith) return <small>έρχεται με {line.comesWith}</small>;
  return line.href ? <Link href={line.href}>Συμπλήρωσε</Link> : null;
}

interface LinesProps {
  lines: readonly LineView[];
  isOwner: boolean;
  isLocked: boolean;
}

// Το κύριο κουτί της οθόνης, ανοιχτό: αυτό ρωτά η σελίδα («τι λείπει ακόμα;»).
export function RequiredLines({ lines, isOwner, isLocked }: LinesProps) {
  const ready = lines.filter((line) => line.done).length;
  return (
    <details className="ml-box o-card" open>
      <summary>
        <h2 className="ml-box-title">Τι πρέπει να είναι έτοιμο</h2>
        <small>{`${ready}/${lines.length} έτοιμα`}</small>
      </summary>
      <ul className="ml-list">
        {lines.map((line) => (
          <li
            key={line.id}
            className="ml-line"
            data-faded={line.done ? "true" : undefined}
          >
            <span className="ml-thumb" aria-hidden="true">
              {line.done ? "✓" : "…"}
            </span>
            <span className="ml-main">
              <strong>{line.what}</strong>
              <small>Ποιος το συμπληρώνει: {line.who}</small>
            </span>
            <span className="ml-tag">{line.done ? "έτοιμο" : "εκκρεμεί"}</span>
            <span className="ml-quick">
              <LineAction line={line} isOwner={isOwner} isLocked={isLocked} />
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
