"use client";

import Link from "next/link";
import { useState } from "react";

import type { DeletionItem } from "@/screens/a7-model";
import { Badge } from "@/screens/shared";

import "./a7.css";

type Resolution = {
  label: string;
  tone?: "attention" | "strong";
  text: string;
};
type Resolutions = Readonly<Record<string, Resolution>>;

function ConfirmForm({
  item,
  onCancel,
  onConfirm,
}: {
  item: DeletionItem;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="stack">
      <label className="stack">
        Λόγος (υποχρεωτικός)
        <textarea
          className="input"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <p className="note">
        {item.isAwaitingApproval
          ? "Ο πελάτης παίρνει email με τον λόγο."
          : "Η Παροχή επιστρέφει πάντα (ακύρωση από την ομάδα)."}
      </p>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-danger="true"
          disabled={!reason.trim()}
          onClick={() => onConfirm(reason.trim())}
        >
          {item.isAwaitingApproval
            ? "Επιβεβαίωση απόρριψης"
            : "Επιβεβαίωση ακύρωσης"}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

function PendingCard({
  item,
  resolution,
  isConfirming,
  onRestore,
  onStartConfirm,
  onCancelConfirm,
  onConfirm,
}: {
  item: DeletionItem;
  resolution: Resolution | undefined;
  isConfirming: boolean;
  onRestore: () => void;
  onStartConfirm: () => void;
  onCancelConfirm: () => void;
  onConfirm: (reason: string) => void;
}) {
  return (
    <section className="card a7-item" data-done={!!resolution}>
      <div className="card-title">
        <h2>
          {item.clientName} · <Link href={item.filmingHref}>{item.when}</Link>
        </h2>
        <Badge>{item.filmingState}</Badge>
      </div>
      <dl className="dl">
        <dt>Το έσβησε στο Google</dt>
        <dd>
          {item.deletedBy}, {item.deletedAtLabel}
        </dd>
        <dt>Προθεσμία</dt>
        <dd>
          <Badge tone={item.hoursLeft < 6 ? "attention" : undefined}>
            {item.deadlineLabel}
          </Badge>
          {item.isDeadlineFilmingStart && (
            <span className="muted">
              {" "}
              (η έναρξη του Γυρίσματος έρχεται πρώτη)
            </span>
          )}
        </dd>
      </dl>
      {resolution ? (
        <div role="status">
          <Badge tone={resolution.tone}>{resolution.label}</Badge>
          <p className="muted">
            {resolution.text} (prototype: δεν αποθηκεύεται)
          </p>
        </div>
      ) : isConfirming ? (
        <ConfirmForm
          item={item}
          onCancel={onCancelConfirm}
          onConfirm={onConfirm}
        />
      ) : (
        <div className="btn-row">
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={onRestore}
          >
            Επαναφορά στο Google
          </button>
          <button
            type="button"
            className="button"
            data-danger="true"
            onClick={onStartConfirm}
          >
            {item.isAwaitingApproval
              ? "Επιβεβαίωση απόρριψης"
              : "Επιβεβαίωση ακύρωσης"}
          </button>
        </div>
      )}
    </section>
  );
}

function RecentRow({
  item,
  resolution,
}: {
  item: DeletionItem;
  resolution?: Resolution;
}) {
  return (
    <li className="a7-recent">
      <div>
        <strong>{item.clientName}</strong> ·{" "}
        <Link href={item.filmingHref}>{item.when}</Link>{" "}
        <Badge>{item.filmingState}</Badge>
      </div>
      <div className="muted">
        Το έσβησε στο Google: {item.deletedBy}, {item.deletedAtLabel}
      </div>
      <div>{resolution ? resolution.text : item.resolution}</div>
    </li>
  );
}

interface A7QueueProps {
  pending: readonly DeletionItem[];
  recent: readonly DeletionItem[];
}

export function A7Queue({ pending, recent }: A7QueueProps) {
  const [resolutions, setResolutions] = useState<Resolutions>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const resolve = (id: string, resolution: Resolution) => {
    setResolutions((prev) => ({ ...prev, [id]: resolution }));
    setConfirmingId(null);
  };
  const stillPending = pending.filter((item) => !resolutions[item.id]);
  const justResolved = pending.filter((item) => resolutions[item.id]);

  return (
    <>
      <h2>Περιμένουν επιβεβαίωση ({stillPending.length})</h2>
      {stillPending.length === 0 && (
        <p className="muted">Καμία διαγραφή δεν περιμένει.</p>
      )}
      {stillPending.map((item) => (
        <PendingCard
          key={item.id}
          item={item}
          resolution={undefined}
          isConfirming={confirmingId === item.id}
          onStartConfirm={() => setConfirmingId(item.id)}
          onCancelConfirm={() => setConfirmingId(null)}
          onRestore={() =>
            resolve(item.id, {
              label: "επανήλθε",
              tone: "strong",
              text: "Επανήλθε από εσένα. Το Γύρισμα ξαναμπήκε στο Εταιρικό ημερολόγιο Google.",
            })
          }
          onConfirm={(reason) =>
            resolve(item.id, {
              label: item.isAwaitingApproval ? "απορρίφθηκε" : "ακυρώθηκε",
              tone: "attention",
              text: `Επιβεβαιώθηκε από εσένα: ${reason}`,
            })
          }
        />
      ))}
      <h2>Πρόσφατα ({justResolved.length + recent.length})</h2>
      <ul className="list">
        {justResolved.map((item) => (
          <RecentRow
            key={item.id}
            item={item}
            resolution={resolutions[item.id]}
          />
        ))}
        {recent.map((item) => (
          <RecentRow key={item.id} item={item} />
        ))}
      </ul>
    </>
  );
}
