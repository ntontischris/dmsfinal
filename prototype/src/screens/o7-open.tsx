import Link from "next/link";

import { BLOCKED_BEFORE_OPENING, OPENING_QUEUE } from "@/data/readiness";
import type { RoleId } from "@/data/roles";
import { ACTOR_NAME, OPENED_ON } from "@/data/settings-access";
import { Badge, fmtDate, screenHref } from "@/screens/shared";

export function WaitingCard() {
  return (
    <section className="card o-card o7-group">
      <h2>Τι περιμένει το άνοιγμα</h2>
      <p className="muted">
        Μέχρι το άνοιγμα η ομάδα δουλεύει κανονικά. Δεν γίνονται:
      </p>
      <ul className="list">
        {BLOCKED_BEFORE_OPENING.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
      <h3>Θα φύγουν με το άνοιγμα</h3>
      <ul className="list o7-queue">
        {OPENING_QUEUE.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
    </section>
  );
}

interface OpenButtonProps {
  role: RoleId;
  isOwner: boolean;
  pending: number;
}

export function OpenButton({ role, isOwner, pending }: OpenButtonProps) {
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
        href={screenHref(role, "O7", { view: "ready", open: "confirm" })}
      >
        Άνοιγμα σε πελάτες
      </Link>
    </div>
  );
}

interface ConfirmProps {
  role: RoleId;
  choice: string | undefined;
}

export function OpenConfirm({ role, choice }: ConfirmProps) {
  const href = (queue?: string) =>
    screenHref(role, "O7", { view: "ready", open: "confirm", queue });
  return (
    <section className="card o-card o7-warn" role="status">
      <h2>Επιβεβαίωση ανοίγματος</h2>
      <p>
        <strong>Γίνεται μία φορά, χωρίς επιστροφή.</strong> Από εκείνη τη στιγμή
        το σύστημα επικοινωνεί κανονικά με πελάτες.
      </p>
      <ul className="list o7-queue">
        {OPENING_QUEUE.map((item) => (
          <li key={item.id}>{item.label}</li>
        ))}
      </ul>
      <div className="o7-choice">
        <Link
          className="button"
          aria-current={choice === "send"}
          href={href("send")}
        >
          Να φύγουν
        </Link>
        <Link
          className="button"
          aria-current={choice === "discard"}
          href={href("discard")}
        >
          Να πεταχτούν
        </Link>
      </div>
      {choice && (
        <p className="note">
          {choice === "send"
            ? "Τα 3 στοιχεία θα σταλούν αμέσως μετά το άνοιγμα."
            : "Τα 3 στοιχεία θα πεταχτούν· ό,τι χρειαστεί θα σταλεί ξανά με το χέρι."}
        </p>
      )}
      <div className="btn-row">
        {choice ? (
          <Link
            className="button"
            data-danger="true"
            href={screenHref(role, "O7", { view: "opened" })}
          >
            Άνοιγμα τώρα
          </Link>
        ) : (
          <button type="button" className="button" disabled>
            Άνοιγμα τώρα
          </button>
        )}
        <Link
          className="button"
          href={screenHref(role, "O7", { view: "ready" })}
        >
          Άκυρο
        </Link>
      </div>
    </section>
  );
}

export function OpenedNotice() {
  return (
    <section className="card o-card" role="status">
      <h2>
        Ανοιχτό από {fmtDate(OPENED_ON)}, από τον{" "}
        {ACTOR_NAME.owner ?? "Ιδιοκτήτη"} <Badge>μόνο ανάγνωση</Badge>
      </h2>
      <p className="muted">
        Το σύστημα δουλεύει με πελάτες. Η λίστα μένει εδώ μόνο για ανάγνωση.
      </p>
    </section>
  );
}
