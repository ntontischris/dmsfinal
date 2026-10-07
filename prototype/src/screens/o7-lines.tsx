import Link from "next/link";

import {
  PENDING_BEFORE_OPENING,
  READINESS_LINES,
  READY_DEFAULTS,
  type ReadinessLine,
} from "@/data/readiness";
import type { RoleId } from "@/data/roles";
import { Badge, screenHref } from "@/screens/shared";

export type LineView = ReadinessLine & { done: boolean };

// Οι γραμμές ανάλογα με την όψη (κανονική, κενή, όλα έτοιμα, ανοιχτό).
export const linesFor = (
  allPending: boolean,
  allReady: boolean,
  confirmedId?: string,
): readonly LineView[] =>
  READINESS_LINES.map((line) => ({
    ...line,
    done: allPending
      ? false
      : allReady ||
        line.id === confirmedId ||
        (line.isReady && !PENDING_BEFORE_OPENING.includes(line.id)),
  }));

function ConfirmButton({
  role,
  lineId,
  isOwner,
}: {
  role: RoleId;
  lineId: string;
  isOwner: boolean;
}) {
  if (isOwner)
    return (
      <Link
        className="button"
        href={screenHref(role, "O7", { confirm: lineId })}
      >
        Επιβεβαίωση
      </Link>
    );
  return (
    <>
      <button type="button" className="button" disabled>
        Επιβεβαίωση
      </button>{" "}
      <span className="muted">Επιβεβαιώνει ο Ιδιοκτήτης</span>
    </>
  );
}

interface ActionProps {
  role: RoleId;
  line: LineView;
  isOwner: boolean;
  isLocked: boolean;
}

function LineAction({ role, line, isOwner, isLocked }: ActionProps) {
  if (isLocked || line.done) return null;
  return (
    <>
      {line.screen && (
        <Link href={screenHref(role, line.screen, {})}>
          Συμπλήρωσε ({line.screen})
        </Link>
      )}{" "}
      {line.isManual && (
        <ConfirmButton role={role} lineId={line.id} isOwner={isOwner} />
      )}
    </>
  );
}

interface LinesProps {
  role: RoleId;
  lines: readonly LineView[];
  isOwner: boolean;
  isLocked: boolean;
}

export function RequiredLines({ role, lines, isOwner, isLocked }: LinesProps) {
  return (
    <section className="card o-card">
      <h2>Τι πρέπει να είναι έτοιμο</h2>
      <div className="scroll">
        <table className="rtable">
          <thead>
            <tr>
              <th>Τι</th>
              <th>Ποιος το συμπληρώνει</th>
              <th>Κατάσταση</th>
              <th>Ενέργεια</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.id}>
                <td data-label="Τι">
                  {line.what}
                  {!line.done && line.note && (
                    <div className="muted">{line.note}</div>
                  )}
                </td>
                <td data-label="Ποιος">{line.who}</td>
                <td data-label="Κατάσταση">
                  {line.done ? (
                    <Badge>έτοιμο</Badge>
                  ) : (
                    <Badge tone="attention">εκκρεμεί</Badge>
                  )}
                </td>
                <td data-label="Ενέργεια">
                  <LineAction
                    role={role}
                    line={line}
                    isOwner={isOwner}
                    isLocked={isLocked}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ReadyDefaults({ role }: { role: RoleId }) {
  return (
    <section className="card o-card o7-group">
      <h2>Έρχονται έτοιμες, απλώς ελέγχονται</h2>
      <p className="muted">Δεν μπλοκάρουν το άνοιγμα.</p>
      <ul className="list">
        {READY_DEFAULTS.map((label) => (
          <li key={label}>
            {label} <Badge>Ελέγχθηκε</Badge>
          </li>
        ))}
      </ul>
      <p className="muted">
        Αλλάζουν όποτε θες από τις{" "}
        <Link href={screenHref(role, "O1", {})}>Ρυθμίσεις</Link>.
      </p>
    </section>
  );
}
