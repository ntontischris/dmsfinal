import Link from "next/link";

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
    <details className="ml-box o-card">
      <summary>
        <h2 className="ml-box-title">Τι περιμένει το άνοιγμα</h2>
        <small>{`${BLOCKED_BEFORE_OPENING.length} πράγματα δεν γίνονται ακόμα`}</small>
      </summary>
      <p className="o-hint">
        Μέχρι το άνοιγμα η ομάδα δουλεύει κανονικά. Δεν γίνονται:
      </p>
      <ul className="ml-list">
        {BLOCKED_BEFORE_OPENING.map((text) => (
          <li key={text} className="ml-line o-line">
            <span className="ml-main">
              <strong>{text}</strong>
            </span>
            <span className="ml-tag">δεν γίνεται</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

interface OpenButtonProps {
  isOwner: boolean;
  pending: number;
}

export function OpenButton({ isOwner, pending }: OpenButtonProps) {
  if (!isOwner || pending > 0)
    return (
      <div className="ml-actions o-left">
        <button type="button" data-primary="true" disabled>
          Άνοιγμα σε πελάτες
        </button>
        <span className="o-hint">
          {isOwner
            ? `Εκκρεμούν ακόμα ${pending}. Όταν γίνουν 0, ενεργοποιείται.`
            : "Το άνοιγμα το πατά μόνο ο Ιδιοκτήτης."}
        </span>
      </div>
    );
  return (
    <div className="ml-actions o-left">
      <Link data-primary="true" href={`${READINESS_HREF}?open=confirm`}>
        Άνοιγμα σε πελάτες
      </Link>
    </div>
  );
}

export function OpenConfirm() {
  return (
    <details className="ml-box o-card o7-warn" open>
      <summary>
        <h2 className="ml-box-title">Επιβεβαίωση ανοίγματος</h2>
        <small>γίνεται μία φορά, χωρίς επιστροφή</small>
      </summary>
      <p role="status">
        <strong>Γίνεται μία φορά, χωρίς επιστροφή.</strong> Από εκείνη τη στιγμή
        το σύστημα επικοινωνεί κανονικά με πελάτες: φεύγουν emails, ανοίγουν οι
        δημόσιες φόρμες και οι προσκλήσεις πελατών.
      </p>
      <OpenForm cancelHref={READINESS_HREF} />
    </details>
  );
}

export function OpenedNotice({ openedAt }: { openedAt: string }) {
  return (
    <p className="o-first o7-opened" role="status">
      <strong>{`Ανοιχτό από ${fmtOpened(openedAt)}`}</strong> · μόνο ανάγνωση.
      Το σύστημα δουλεύει με πελάτες· η λίστα μένει εδώ μόνο για ανάγνωση.
    </p>
  );
}
