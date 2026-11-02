"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { decideRescheduleRequest } from "../actions-booking";
import {
  approveFilming,
  decideCancelRequest,
  rejectFilming,
} from "../actions-transitions";
import type { CancelItem, PendingItem, RescheduleItem } from "./e2-adapter";
import { countLabel, waitingLabel } from "./e1-format";
import type { FormAction } from "./e3-run";

// Η ουρά «Αναμένουν έγκριση» (prototype `screens/e2-queue.tsx`): κάθε κουμπί καλεί το πραγματικό action· το αποτέλεσμα
// μένει δίπλα στην κάρτα μέχρι να φρεσκάρει η λίστα.

type Outcome = { label: string; tone?: "attention" | "strong"; text: string };
type Outcomes = Readonly<Record<string, Outcome>>;
type Open = { id: string; kind: "reject" | "refuseMove" } | null;

function Result({ outcome }: { outcome: Outcome }) {
  return (
    <div role="status">
      <Badge tone={outcome.tone}>{outcome.label}</Badge>
      <p className="muted">{outcome.text}</p>
    </div>
  );
}

function ReasonBox({
  label,
  confirmLabel,
  isPending,
  onCancel,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="stack">
      <label className="stack">
        {label}
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
          disabled={!reason.trim() || isPending}
          onClick={() => onConfirm(reason.trim())}
        >
          {confirmLabel}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

function Actions({
  yes,
  no,
  isPending,
}: {
  yes: { label: string; onClick: () => void };
  no: { label: string; onClick: () => void; isDanger?: boolean };
  isPending: boolean;
}) {
  return (
    <span className="sx-actions">
      <button
        type="button"
        className="button"
        data-primary="true"
        disabled={isPending}
        onClick={yes.onClick}
      >
        {yes.label}
      </button>
      <button
        type="button"
        className="button"
        data-danger={no.isDanger}
        disabled={isPending}
        onClick={no.onClick}
      >
        {no.label}
      </button>
    </span>
  );
}

function Title({
  name,
  href,
  production,
}: {
  name: string;
  href: string;
  production: string;
}) {
  return (
    <>
      {name} · <Link href={href}>{production}</Link>
    </>
  );
}

interface E2QueueProps {
  pending: readonly PendingItem[];
  cancels: readonly CancelItem[];
  reschedules: readonly RescheduleItem[];
}

export function E2Queue({ pending, cancels, reschedules }: E2QueueProps) {
  const [outcomes, setOutcomes] = useState<Outcomes>({});
  const [open, setOpen] = useState<Open>(null);
  const [isPending, startTransition] = useTransition();
  const send = (
    id: string,
    action: FormAction,
    fields: Record<string, string>,
    done: Omit<Outcome, "text">,
  ) =>
    startTransition(async () => {
      const form = new FormData();
      Object.entries({ filmingId: id, ...fields }).forEach(([key, value]) =>
        form.append(key, value),
      );
      const state = await action({}, form);
      setOutcomes((prev) => ({
        ...prev,
        [id]: state.error
          ? { label: "δεν έγινε", tone: "attention", text: state.error }
          : { ...done, text: state.notice ?? "" },
      }));
      if (!state.error) setOpen(null);
    });

  return (
    <>
      <Panel label="Αναμένουν έγκριση" aside={pending.length} isFlush>
        {pending.length === 0 && (
          <p className="muted sx-pad">Κανένα Γύρισμα δεν περιμένει έγκριση.</p>
        )}
        <RowList>
          {pending.map((item) => {
            const outcome = outcomes[item.id];
            const isRejecting = open?.id === item.id && open.kind === "reject";
            return (
              <PendingRow key={item.id} item={item} outcome={outcome}>
                {!outcome && !isRejecting && (
                  <Actions
                    isPending={isPending}
                    yes={{
                      label: "Έγκριση",
                      onClick: () =>
                        send(
                          item.id,
                          approveFilming,
                          {},
                          {
                            label: "εγκρίθηκε",
                            tone: "strong",
                          },
                        ),
                    }}
                    no={{
                      label: "Απόρριψη",
                      isDanger: true,
                      onClick: () => setOpen({ id: item.id, kind: "reject" }),
                    }}
                  />
                )}
                {isRejecting && !outcome && (
                  <ReasonBox
                    label="Λόγος απόρριψης (υποχρεωτικός, τον βλέπει ο πελάτης)"
                    confirmLabel="Απορρίπτω"
                    isPending={isPending}
                    onCancel={() => setOpen(null)}
                    onConfirm={(reason) =>
                      send(
                        item.id,
                        rejectFilming,
                        { reason },
                        {
                          label: "απορρίφθηκε",
                          tone: "attention",
                        },
                      )
                    }
                  />
                )}
              </PendingRow>
            );
          })}
        </RowList>
      </Panel>
      <Panel
        label="Αιτήματα ακύρωσης μετά το Όριο"
        aside={cancels.length}
        isFlush
      >
        {cancels.length === 0 && (
          <p className="muted sx-pad">Κανένα αίτημα ακύρωσης δεν περιμένει.</p>
        )}
        <RowList>
          {cancels.map((item) => {
            const outcome = outcomes[item.id];
            return (
              <CancelRow key={item.id} item={item} outcome={outcome}>
                {!outcome && (
                  <Actions
                    isPending={isPending}
                    yes={{
                      label: "Δέχομαι",
                      onClick: () =>
                        send(
                          item.id,
                          decideCancelRequest,
                          { accept: "accept" },
                          {
                            label: "ακυρώθηκε",
                            tone: "strong",
                          },
                        ),
                    }}
                    no={{
                      label: "Αρνούμαι",
                      onClick: () =>
                        send(
                          item.id,
                          decideCancelRequest,
                          { accept: "refuse" },
                          {
                            label: "μένει προγραμματισμένο",
                          },
                        ),
                    }}
                  />
                )}
              </CancelRow>
            );
          })}
        </RowList>
      </Panel>
      {reschedules.length > 0 && (
        <Panel label="Αιτήματα μετάθεσης" aside={reschedules.length} isFlush>
          <RowList>
            {reschedules.map((item) => {
              const outcome = outcomes[item.id];
              const isRefusing =
                open?.id === item.id && open.kind === "refuseMove";
              return (
                <RescheduleRow key={item.id} item={item} outcome={outcome}>
                  {!outcome && !isRefusing && (
                    <Actions
                      isPending={isPending}
                      yes={{
                        label: "Έγκριση μετάθεσης",
                        onClick: () =>
                          send(
                            item.id,
                            decideRescheduleRequest,
                            { accept: "accept" },
                            {
                              label: "μετατέθηκε",
                              tone: "strong",
                            },
                          ),
                      }}
                      no={{
                        label: "Απόρριψη",
                        onClick: () =>
                          setOpen({ id: item.id, kind: "refuseMove" }),
                      }}
                    />
                  )}
                  {isRefusing && !outcome && (
                    <ReasonBox
                      label="Λόγος απόρριψης της μετάθεσης (τον βλέπει ο πελάτης)"
                      confirmLabel="Απορρίπτω"
                      isPending={isPending}
                      onCancel={() => setOpen(null)}
                      onConfirm={(reason) =>
                        send(
                          item.id,
                          decideRescheduleRequest,
                          { accept: "refuse", reason },
                          { label: "μένει στην παλιά ώρα" },
                        )
                      }
                    />
                  )}
                </RescheduleRow>
              );
            })}
          </RowList>
        </Panel>
      )}
    </>
  );
}

function PendingRow({
  item,
  outcome,
  children,
}: {
  item: PendingItem;
  outcome: Outcome | undefined;
  children: ReactNode;
}) {
  return (
    <>
      <ListRow
        isFaded={!!outcome}
        lead={<Avatar name={item.clientName} size={40} />}
        title={
          <Title
            name={item.clientName}
            href={item.filmingHref}
            production={item.production}
          />
        }
        sub={`${item.when} (${item.hours} ώρες)`}
        aside={
          <Badge tone={item.isWaitingLong ? "attention" : "waiting"}>
            περιμένει {waitingLabel(item.waitingHours)}
          </Badge>
        }
      />
      <li className="sx-extra" data-done={!!outcome}>
        <dl className="dl">
          <dt>Πότε</dt>
          <dd>
            {item.when} ({item.hours} ώρες)
          </dd>
          <dt>Παροχή</dt>
          <dd>{item.balance ?? "—"}</dd>
        </dl>
        {children}
        {outcome && <Result outcome={outcome} />}
        {!outcome && (
          <p className="note">
            Η Έγκριση δεν χρειάζεται Συνεργείο· ορίζεται μετά, στο Γύρισμα.
          </p>
        )}
      </li>
    </>
  );
}

function CancelRow({
  item,
  outcome,
  children,
}: {
  item: CancelItem;
  outcome: Outcome | undefined;
  children: ReactNode;
}) {
  return (
    <>
      <ListRow
        isFaded={!!outcome}
        lead={<Avatar name={item.clientName} size={40} />}
        title={
          <Title
            name={item.clientName}
            href={item.filmingHref}
            production={item.production}
          />
        }
        sub={item.when}
        aside={
          <Badge tone="attention">
            σε {countLabel(item.hoursLeft, "ώρα", "ώρες")}
          </Badge>
        }
      />
      <li className="sx-extra" data-done={!!outcome}>
        <dl className="dl">
          <dt>Πότε</dt>
          <dd>{item.when}</dd>
          <dt>Ζητήθηκε</dt>
          <dd>{item.requestedAt}</dd>
          <dt>Λόγος</dt>
          <dd>«{item.reason}»</dd>
          <dt>Αν δεχτείς</dt>
          <dd>
            {item.burns
              ? "Το Γύρισμα ακυρώνεται και η Παροχή καίγεται (η Συμφωνία το ορίζει)."
              : "Το Γύρισμα ακυρώνεται και η Παροχή επιστρέφει."}
          </dd>
        </dl>
        {children}
        {outcome && <Result outcome={outcome} />}
      </li>
    </>
  );
}

function RescheduleRow({
  item,
  outcome,
  children,
}: {
  item: RescheduleItem;
  outcome: Outcome | undefined;
  children: ReactNode;
}) {
  return (
    <>
      <ListRow
        isFaded={!!outcome}
        lead={<Avatar name={item.clientName} size={40} />}
        title={
          <Title
            name={item.clientName}
            href={item.filmingHref}
            production={item.production}
          />
        }
        sub={`${item.when} → ${item.newWhen}`}
        aside={
          item.slotProblem && <Badge tone="attention">{item.slotProblem}</Badge>
        }
      />
      <li className="sx-extra" data-done={!!outcome}>
        <dl className="dl">
          <dt>Τώρα</dt>
          <dd>{item.when}</dd>
          <dt>Ζητά</dt>
          <dd>{item.newWhen}</dd>
          <dt>Ζητήθηκε</dt>
          <dd>{item.requestedAt}</dd>
        </dl>
        {children}
        {outcome && <Result outcome={outcome} />}
      </li>
    </>
  );
}
