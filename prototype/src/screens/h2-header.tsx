"use client";

import Link from "next/link";

import {
  TODAY,
  isLateLive,
  whoLabel,
  type PanelProps,
} from "@/screens/h2-model";
import { setAssignee, setDeadline } from "@/screens/h2-reducers";
import { Badge, fmtDate } from "@/screens/shared";

function AssigneeField({ ctx, live, update }: PanelProps) {
  if (!ctx.caps.canWork) return <span>{whoLabel(live.assigneeId)}</span>;
  const known = ctx.people.some((p) => p.id === live.assigneeId);
  const options = known
    ? ctx.people
    : [...ctx.people, { id: live.assigneeId, name: whoLabel(live.assigneeId) }];
  return (
    <select
      className="select"
      aria-label="Ανατεθειμένος"
      value={live.assigneeId}
      onChange={(event) => {
        const person = options.find((p) => p.id === event.target.value);
        if (person) update((l) => setAssignee(l, ctx, person));
      }}
    >
      {options.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

function DeadlineField({ ctx, live, update }: PanelProps) {
  const waits = !live.deadline && ctx.filmingDate;
  return (
    <span className="h2-inline">
      {live.deadline ? (
        <span>
          {fmtDate(live.deadline)} ({ctx.basis})
        </span>
      ) : (
        <span>
          {ctx.filmingDate
            ? `μετά το Γύρισμα της ${fmtDate(ctx.filmingDate).slice(0, 5)}`
            : "χωρίς ημερομηνία"}
        </span>
      )}
      {ctx.caps.canWork && (
        <input
          className="input"
          type="date"
          aria-label="Προθεσμία"
          value={live.deadline ?? ""}
          min={waits ? undefined : TODAY}
          onChange={(event) =>
            update((l) => setDeadline(l, ctx, event.target.value))
          }
        />
      )}
    </span>
  );
}

export function H2Header(props: PanelProps) {
  const { ctx, live } = props;
  const isLate = isLateLive(live);
  return (
    <header className="h2-header">
      <h1>{ctx.title}</h1>
      <div className="h2-signals">
        <Badge tone="strong">{live.state}</Badge>
        {isLate && <Badge tone="attention">καθυστερεί (εσωτερικά)</Badge>}
        {ctx.isInternalProduction && <Badge>Εσωτερική</Badge>}
        {ctx.extra && <Badge>έξτρα {ctx.extra}</Badge>}
      </div>
      <dl className="dl">
        <dt>Πελάτης — Παραγωγή</dt>
        <dd>
          <Link href={ctx.production.href}>
            {ctx.production.clientName} — {ctx.production.title}
          </Link>
        </dd>
        <dt>Είδος</dt>
        <dd>{ctx.kindName}</dd>
        <dt>Περίοδος</dt>
        <dd>{ctx.production.periodLabel}</dd>
        <dt>Ανατεθειμένος</dt>
        <dd>
          <AssigneeField {...props} />
        </dd>
        <dt>Προθεσμία</dt>
        <dd>
          <DeadlineField {...props} />
        </dd>
        <dt>Γύροι αλλαγών</dt>
        <dd>
          {live.roundsUsed} από {ctx.limit}
          {live.roundsUsed > ctx.limit && " (πέρα από το όριο)"}
        </dd>
      </dl>
      <p className="muted">
        Η προθεσμία μετρά σε εργασίμες από το Γύρισμα που έγινε (ή από τη
        δημιουργία). Η καθυστέρηση δεν τρέχει όσο αναμένει πελάτη ή όσο η Έκδοση
        είναι σε έλεγχο.
      </p>
    </header>
  );
}
