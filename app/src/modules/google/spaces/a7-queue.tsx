"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { resolveGoogleDeletion } from "../actions";
import type { DeletionItem } from "./a7-model";

// Η ουρά των διαγραφών (prototype `screens/a7-queue.tsx`): «Επαναφορά» ή «Επιβεβαίωση» στο πραγματικό
// google_deletion_resolve. Η απόφαση μένει δίπλα στην κάρτα μέχρι να φρεσκάρει η λίστα.

type Resolution = {
  label: string;
  tone?: "attention" | "strong";
  text: string;
};
type Resolutions = Readonly<Record<string, Resolution>>;

const confirmLabelOf = (item: DeletionItem): string =>
  item.isAwaitingApproval ? "Επιβεβαίωση απόρριψης" : "Επιβεβαίωση ακύρωσης";

function ConfirmForm({
  item,
  isPending,
  onCancel,
  onConfirm,
}: {
  item: DeletionItem;
  isPending: boolean;
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
          disabled={!reason.trim() || isPending}
          onClick={() => onConfirm(reason.trim())}
        >
          {confirmLabelOf(item)}
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
  isPending,
  onRestore,
  onStartConfirm,
  onCancelConfirm,
  onConfirm,
}: {
  item: DeletionItem;
  resolution: Resolution | undefined;
  isConfirming: boolean;
  isPending: boolean;
  onRestore: () => void;
  onStartConfirm: () => void;
  onCancelConfirm: () => void;
  onConfirm: (reason: string) => void;
}) {
  return (
    <div className="a7-item" data-done={!!resolution}>
      <Panel label={item.title} aside={<Badge>{item.stateLabel}</Badge>}>
        <RowList>
          <ListRow
            title="Σβήστηκε στο Google"
            sub={`εντοπίστηκε ${item.detectedAtLabel}`}
            aside={<Link href={item.filmingHref}>{item.whenLabel}</Link>}
          />
          <ListRow
            title="Προθεσμία"
            sub={
              item.isDeadlineFilmingStart
                ? "(η έναρξη του Γυρίσματος έρχεται πρώτη)"
                : undefined
            }
            aside={
              <Badge tone={item.hoursLeft < 6 ? "attention" : undefined}>
                {item.deadlineLabel}
              </Badge>
            }
          />
        </RowList>
        {resolution ? (
          <div role="status">
            <Badge tone={resolution.tone}>{resolution.label}</Badge>
            <p className="muted">{resolution.text}</p>
          </div>
        ) : isConfirming ? (
          <ConfirmForm
            item={item}
            isPending={isPending}
            onCancel={onCancelConfirm}
            onConfirm={onConfirm}
          />
        ) : (
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-primary="true"
              disabled={isPending}
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
              {confirmLabelOf(item)}
            </button>
          </div>
        )}
      </Panel>
    </div>
  );
}

export function A7Queue({ pending }: { pending: readonly DeletionItem[] }) {
  const [resolutions, setResolutions] = useState<Resolutions>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const resolve = (
    item: DeletionItem,
    fields: { restore: boolean; reason: string },
    done: Omit<Resolution, "text">,
  ) =>
    startTransition(async () => {
      const form = new FormData();
      form.append("filmingId", item.id);
      if (fields.restore) form.append("restore", "on");
      form.append("reason", fields.reason);
      const state = await resolveGoogleDeletion({}, form);
      setResolutions((prev) => ({
        ...prev,
        [item.id]: state.error
          ? { label: "δεν έγινε", tone: "attention", text: state.error }
          : { ...done, text: state.notice ?? "" },
      }));
      if (!state.error) setConfirmingId(null);
    });

  return (
    <>
      <h2>Περιμένουν επιβεβαίωση ({pending.length})</h2>
      {pending.map((item) => (
        <PendingCard
          key={item.id}
          item={item}
          resolution={resolutions[item.id]}
          isConfirming={confirmingId === item.id}
          isPending={isPending}
          onStartConfirm={() => setConfirmingId(item.id)}
          onCancelConfirm={() => setConfirmingId(null)}
          onRestore={() =>
            resolve(
              item,
              { restore: true, reason: "" },
              {
                label: "επανήλθε",
                tone: "strong",
              },
            )
          }
          onConfirm={(reason) =>
            resolve(
              item,
              { restore: false, reason },
              {
                label: item.isAwaitingApproval ? "απορρίφθηκε" : "ακυρώθηκε",
                tone: "attention",
              },
            )
          }
        />
      ))}
    </>
  );
}
