"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";

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
import { Line, Lines } from "./ml-parts";

// Η ουρά «Αναμένουν έγκριση» (prototype `screens/e2-queue.tsx`): κάθε κουμπί καλεί το πραγματικό action· το αποτέλεσμα
// μένει δίπλα στην κάρτα μέχρι να φρεσκάρει η λίστα.

type Outcome = { label: string; tone?: "attention" | "strong"; text: string };
type Outcomes = Readonly<Record<string, Outcome>>;
type Open = { id: string; kind: "reject" | "refuseMove" } | null;

function Result({ outcome }: { outcome: Outcome }) {
  return (
    <div role="status">
      <Badge tone={outcome.tone}>{outcome.label}</Badge>
      {outcome.text && <small>{outcome.text}</small>}
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
    <div className="ml-fields">
      <label className="ml-field" data-wide>
        <span>{label}</span>
        <textarea
          className="input"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <div className="ml-actions">
        <button
          type="button"
          data-danger="true"
          disabled={!reason.trim() || isPending}
          onClick={() => onConfirm(reason.trim())}
        >
          {confirmLabel}
        </button>
        <button type="button" onClick={onCancel}>
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
    <span className="ml-quick fl-row">
      <button
        type="button"
        data-primary="true"
        disabled={isPending}
        onClick={yes.onClick}
      >
        {yes.label}
      </button>
      <button
        type="button"
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
  // Τι δείχνει η ουρά όταν δεν περιμένει τίποτα (και μετά την τελευταία απόφαση).
  empty: ReactNode;
}

export function E2Queue({
  pending,
  cancels,
  reschedules,
  empty,
}: E2QueueProps) {
  const [outcomes, setOutcomes] = useState<Outcomes>({});
  // Η τελευταία απόφαση μένει ορατή κι όταν η γραμμή της φύγει από τη λίστα (και όταν η ουρά αδειάσει).
  const [last, setLast] = useState<Outcome | null>(null);
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
      const outcome: Outcome = state.error
        ? { label: "δεν έγινε", tone: "attention", text: state.error }
        : { ...done, text: state.notice ?? "" };
      setOutcomes((prev) => ({ ...prev, [id]: outcome }));
      setLast(outcome);
      if (!state.error) setOpen(null);
    });

  if (pending.length + cancels.length + reschedules.length === 0)
    return (
      <>
        {last && <Result outcome={last} />}
        {empty}
      </>
    );
  return (
    <>
      {last && <Result outcome={last} />}
      <section>
        <header className="fl-group-head">
          <h2 className="ml-box-title">Αναμένουν έγκριση</h2>
          <small>{pending.length}</small>
        </header>
        {pending.length === 0 && (
          <p className="ml-empty">Κανένα Γύρισμα δεν περιμένει έγκριση.</p>
        )}
        <Lines>
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
        </Lines>
      </section>
      <section>
        <header className="fl-group-head">
          <h2 className="ml-box-title">Αιτήματα ακύρωσης μετά το Όριο</h2>
          <small>{cancels.length}</small>
        </header>
        {cancels.length === 0 && (
          <p className="ml-empty">Κανένα αίτημα ακύρωσης δεν περιμένει.</p>
        )}
        <Lines>
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
        </Lines>
      </section>
      {reschedules.length > 0 && (
        <section>
          <header className="fl-group-head">
            <h2 className="ml-box-title">Αιτήματα μετάθεσης</h2>
            <small>{reschedules.length}</small>
          </header>
          <Lines>
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
          </Lines>
        </section>
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
    <Line
      isFaded={!!outcome}
      thumb={item.clientName}
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
    >
      <dl className="ml-kv">
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
        <p className="fl-note">
          Η Έγκριση δεν χρειάζεται Συνεργείο· ορίζεται μετά, στο Γύρισμα.
        </p>
      )}
    </Line>
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
    <Line
      isFaded={!!outcome}
      thumb={item.clientName}
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
    >
      <dl className="ml-kv">
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
    </Line>
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
    <Line
      isFaded={!!outcome}
      thumb={item.clientName}
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
    >
      <dl className="ml-kv">
        <dt>Τώρα</dt>
        <dd>{item.when}</dd>
        <dt>Ζητά</dt>
        <dd>{item.newWhen}</dd>
        <dt>Ζητήθηκε</dt>
        <dd>{item.requestedAt}</dd>
      </dl>
      {children}
      {outcome && <Result outcome={outcome} />}
    </Line>
  );
}
