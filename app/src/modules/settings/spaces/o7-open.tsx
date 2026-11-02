import Link from "next/link";

import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import { fmtOpened } from "./o7-adapter";
import { OpenForm } from "./o7-open-form";
import { READINESS_HREF } from "./o-shared";

// Το άνοιγμα σε πελάτες (prototype `screens/o7-open.tsx`). Μία φορά, μόνο ο Ιδιοκτήτης, με το πραγματικό action.

// Όσα δεν γίνονται πριν το άνοιγμα (οι κανόνες του συστήματος, όπως τους λέει και η φόρμα ανοίγματος).
const BLOCKED_BEFORE_OPENING: readonly string[] = [
  "Προσκλήσεις Χρηστών πελάτη",
  "Κάθε email προς πελάτες",
  "Οι δημόσιες φόρμες της Ιστοσελίδας",
];

export function WaitingCard() {
  return (
    <div className="o-card o7-group">
      <Panel label="Τι περιμένει το άνοιγμα" isFlush>
        <p className="muted o7-pad">
          Μέχρι το άνοιγμα η ομάδα δουλεύει κανονικά. Δεν γίνονται:
        </p>
        <RowList>
          {BLOCKED_BEFORE_OPENING.map((text) => (
            <ListRow
              key={text}
              title={text}
              aside={<Badge tone="waiting">δεν γίνεται</Badge>}
            />
          ))}
        </RowList>
      </Panel>
    </div>
  );
}

interface OpenButtonProps {
  isOwner: boolean;
  pending: number;
}

export function OpenButton({ isOwner, pending }: OpenButtonProps) {
  if (!isOwner)
    return (
      <p className="note">
        <button type="button" className="button" disabled>
          Άνοιγμα σε πελάτες
        </button>{" "}
        Το άνοιγμα το πατά μόνο ο Ιδιοκτήτης.
      </p>
    );
  if (pending > 0)
    return (
      <p className="note">
        <button type="button" className="button" disabled>
          Άνοιγμα σε πελάτες
        </button>{" "}
        Εκκρεμούν ακόμα {pending}. Όταν γίνουν 0, ενεργοποιείται.
      </p>
    );
  return (
    <div className="btn-row">
      <Link
        className="button"
        data-primary="true"
        href={`${READINESS_HREF}?open=confirm`}
      >
        Άνοιγμα σε πελάτες
      </Link>
    </div>
  );
}

export function OpenConfirm() {
  return (
    <div className="o-card o7-warn" role="status">
      <Panel label="Επιβεβαίωση ανοίγματος">
        <p>
          <strong>Γίνεται μία φορά, χωρίς επιστροφή.</strong> Από εκείνη τη
          στιγμή το σύστημα επικοινωνεί κανονικά με πελάτες: φεύγουν emails,
          ανοίγουν οι δημόσιες φόρμες και οι προσκλήσεις πελατών.
        </p>
        <OpenForm cancelHref={READINESS_HREF} />
      </Panel>
    </div>
  );
}

export function OpenedNotice({ openedAt }: { openedAt: string }) {
  return (
    <div className="o-card" role="status">
      <Panel
        label={`Ανοιχτό από ${fmtOpened(openedAt)}`}
        aside={<Badge>μόνο ανάγνωση</Badge>}
      >
        <p className="muted">
          Το σύστημα δουλεύει με πελάτες. Η λίστα μένει εδώ μόνο για ανάγνωση.
        </p>
      </Panel>
    </div>
  );
}
