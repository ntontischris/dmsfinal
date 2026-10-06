"use client";

import Link from "next/link";
import { useState } from "react";

import { FILMING_RULES } from "@/data/filming";
import type { RoleId } from "@/data/roles";
import { waitingLabel } from "@/screens/e1-format";
import { Badge, screenHref } from "@/screens/shared";

import "./e1.css";

export interface PendingItem {
  id: string;
  filmingHref: string;
  clientName: string;
  production: string;
  when: string;
  hours: number;
  location: string;
  clientNote: string | null;
  bookedBy: string;
  waitingHours: number;
  balance: string | null;
  taken: number;
  capacity: number;
}

export interface CancelItem {
  id: string;
  filmingHref: string;
  clientName: string;
  production: string;
  when: string;
  by: string;
  reason: string;
  hoursLeft: number;
  limitHours: number;
  burns: boolean;
}

type Outcome = { label: string; tone?: "attention" | "strong"; text: string };
type Outcomes = Readonly<Record<string, Outcome>>;
type Open = { id: string; kind: "reject" } | null;

function Result({ outcome }: { outcome: Outcome }) {
  return (
    <div role="status">
      <Badge tone={outcome.tone}>{outcome.label}</Badge>
      <p className="muted">{outcome.text} (prototype: δεν αποθηκεύεται)</p>
    </div>
  );
}

function RejectForm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="stack">
      <label className="stack">
        Λόγος απόρριψης (υποχρεωτικός, τον βλέπει ο πελάτης)
        <textarea
          className="input"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-danger="true"
          disabled={!reason.trim()}
          onClick={() => onConfirm(reason.trim())}
        >
          Απορρίπτω
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

interface PendingCardProps {
  item: PendingItem;
  outcome: Outcome | undefined;
  isRejecting: boolean;
  onApprove: () => void;
  onStartReject: () => void;
  onCancelReject: () => void;
  onReject: (reason: string) => void;
}

function PendingCard(props: PendingCardProps) {
  const { item, outcome } = props;
  const isFull = item.taken > item.capacity;
  return (
    <section className="card e2-item" data-done={!!outcome}>
      <div className="card-title">
        <h2>
          {item.clientName} ·{" "}
          <Link href={item.filmingHref}>{item.production}</Link>
        </h2>
        <Badge tone="attention">
          περιμένει {waitingLabel(item.waitingHours)}
        </Badge>
      </div>
      <dl className="dl">
        <dt>Πότε</dt>
        <dd>
          {item.when} ({item.hours} ώρες)
        </dd>
        <dt>Πού</dt>
        <dd>{item.location}</dd>
        <dt>Έκλεισε</dt>
        <dd>{item.bookedBy}</dd>
        <dt>Σημείωση πελάτη</dt>
        <dd>{item.clientNote ?? "—"}</dd>
        <dt>Παροχή «Γύρισμα»</dt>
        <dd>{item.balance ?? "—"}</dd>
        <dt>Χωρητικότητα</dt>
        <dd>
          {item.taken} από {item.capacity} θέσεις σε αυτή την ώρα (μαζί με αυτό)
          {isFull && " · υπέρβαση"}
        </dd>
      </dl>
      {outcome ? (
        <Result outcome={outcome} />
      ) : props.isRejecting ? (
        <RejectForm
          onCancel={props.onCancelReject}
          onConfirm={props.onReject}
        />
      ) : (
        <div className="btn-row">
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={props.onApprove}
          >
            Έγκριση
          </button>
          <button
            type="button"
            className="button"
            data-danger="true"
            onClick={props.onStartReject}
          >
            Απόρριψη
          </button>
        </div>
      )}
      {!outcome && (
        <p className="note">
          Η Έγκριση δεν χρειάζεται Συνεργείο· ορίζεται μετά, στο Γύρισμα.
        </p>
      )}
    </section>
  );
}

interface CancelCardProps {
  item: CancelItem;
  outcome: Outcome | undefined;
  onAccept: () => void;
  onDecline: () => void;
}

function CancelCard({ item, outcome, onAccept, onDecline }: CancelCardProps) {
  return (
    <section className="card e2-item" data-done={!!outcome}>
      <div className="card-title">
        <h2>
          {item.clientName} ·{" "}
          <Link href={item.filmingHref}>{item.production}</Link>
        </h2>
        <Badge tone="attention">
          σε {item.hoursLeft} ώρες (Όριο {item.limitHours})
        </Badge>
      </div>
      <dl className="dl">
        <dt>Πότε</dt>
        <dd>{item.when}</dd>
        <dt>Ζήτησε</dt>
        <dd>{item.by}</dd>
        <dt>Λόγος</dt>
        <dd>«{item.reason}»</dd>
        <dt>Αν δεχτείς</dt>
        <dd>
          {item.burns
            ? "Το Γύρισμα ακυρώνεται και η Παροχή καίγεται (η Συμφωνία το ορίζει)."
            : "Το Γύρισμα ακυρώνεται και η Παροχή επιστρέφει."}
        </dd>
      </dl>
      {outcome ? (
        <Result outcome={outcome} />
      ) : (
        <div className="btn-row">
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={onAccept}
          >
            Δέχομαι
          </button>
          <button type="button" className="button" onClick={onDecline}>
            Αρνούμαι
          </button>
        </div>
      )}
    </section>
  );
}

interface E2QueueProps {
  role: RoleId;
  pending: readonly PendingItem[];
  cancels: readonly CancelItem[];
}

export function E2Queue({ role, pending, cancels }: E2QueueProps) {
  const [outcomes, setOutcomes] = useState<Outcomes>({});
  const [open, setOpen] = useState<Open>(null);
  const record = (id: string, outcome: Outcome) => {
    setOutcomes((prev) => ({ ...prev, [id]: outcome }));
    setOpen(null);
  };

  return (
    <>
      <p className="note">
        Αν δεν απαντήσει κανείς σε {FILMING_RULES.noAnswer.hours} ώρες:{" "}
        {FILMING_RULES.noAnswer.action}. Αλλάζει στις{" "}
        <Link href={screenHref(role, "O4", {})}>Ρυθμίσεις</Link>. Σε εταιρεία
        ενός ανθρώπου ο Ιδιοκτήτης τα βλέπει και τα κάνει όλα εδώ· τίποτα δεν
        μπλοκάρει.
      </p>
      <h2>Αναμένουν έγκριση ({pending.length})</h2>
      {pending.length === 0 && (
        <p className="muted">Κανένα Γύρισμα δεν περιμένει έγκριση.</p>
      )}
      {pending.map((item) => (
        <PendingCard
          key={item.id}
          item={item}
          outcome={outcomes[item.id]}
          isRejecting={open?.id === item.id}
          onStartReject={() => setOpen({ id: item.id, kind: "reject" })}
          onCancelReject={() => setOpen(null)}
          onApprove={() =>
            record(item.id, {
              label: "εγκρίθηκε",
              tone: "strong",
              text: "Το Γύρισμα έγινε προγραμματισμένο και στάλθηκε email στον πελάτη. Ορίστε Συνεργείο από το Γύρισμα.",
            })
          }
          onReject={(reason) =>
            record(item.id, {
              label: "απορρίφθηκε",
              tone: "attention",
              text: `Στάλθηκε email στον πελάτη με τον λόγο «${reason}». Η Παροχή «Γύρισμα» ελευθερώθηκε.`,
            })
          }
        />
      ))}
      <h2>Αιτήματα ακύρωσης μετά το Όριο ({cancels.length})</h2>
      {cancels.length === 0 && (
        <p className="muted">Κανένα αίτημα ακύρωσης δεν περιμένει.</p>
      )}
      {cancels.map((item) => (
        <CancelCard
          key={item.id}
          item={item}
          outcome={outcomes[item.id]}
          onAccept={() =>
            record(item.id, {
              label: "ακυρώθηκε",
              tone: "strong",
              text: item.burns
                ? "Το Γύρισμα ακυρώθηκε και η Παροχή κάηκε· ενημερώθηκε ο πελάτης."
                : "Το Γύρισμα ακυρώθηκε και η Παροχή επέστρεψε· ενημερώθηκε ο πελάτης.",
            })
          }
          onDecline={() =>
            record(item.id, {
              label: "μένει προγραμματισμένο",
              text: "Το Γύρισμα μένει όπως ήταν· ενημερώθηκε ο πελάτης ότι το αίτημα δεν έγινε δεκτό.",
            })
          }
        />
      ))}
    </>
  );
}
