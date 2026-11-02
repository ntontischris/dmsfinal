"use client";

import Link from "next/link";
import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Person } from "@/spaces/kit/parts";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import { updateDeliverable } from "../actions-deliverable";
import { NO_ASSIGNEE_LABEL } from "../labels";
import type { AssigneeCandidate, DeliverableDetail } from "../types";
import { clientAndTitle } from "./h1-model";
import { AutoSaveForm, submitOnChange } from "./h2-form";
import {
  STATE_WORDS,
  extraOf,
  isReopened,
  roundsLabel,
  type PanelProps,
} from "./h2-model";

// Η κεφαλίδα του H2 (prototype `screens/h2-header.tsx`). Ανατεθειμένος και Προθεσμία αλλάζουν με το deliverable_update,
// που θέλει όλα τα στοιχεία· τα υπόλοιπα πάνε όπως είναι.
const keepOf = (detail: DeliverableDetail) => ({
  deliverableId: detail.id,
  title: detail.title,
  assigneeId: detail.assigneeId ?? "",
  filmingId: detail.filmingId ?? "",
  deadline: detail.deadline ?? "",
});

const withoutKey = (fields: Record<string, string>, key: string) =>
  Object.fromEntries(Object.entries(fields).filter(([name]) => name !== key));

// Ο σημερινός Ανατεθειμένος μένει στη λίστα ακόμα κι αν δεν είναι πια υποψήφιος (π.χ. ανενεργός).
const optionsOf = (
  detail: DeliverableDetail,
  assignees: readonly AssigneeCandidate[],
): readonly AssigneeCandidate[] =>
  detail.assigneeId === null ||
  assignees.some((p) => p.id === detail.assigneeId)
    ? assignees
    : [
        ...assignees,
        { id: detail.assigneeId, name: detail.assigneeName ?? "—" },
      ];

function AssigneeField({ detail, ctx }: PanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const name = detail.assigneeName ?? NO_ASSIGNEE_LABEL;
  if (!detail.can.edit || ctx.assignees === null) return <Person name={name} />;
  // Φαίνεται ένα όνομα· η λίστα ανοίγει μόνο με «Αλλαγή».
  if (!isEditing)
    return (
      <span className="h2-inline">
        <Person name={name} />
        <button
          type="button"
          className="button"
          aria-label={`Αλλαγή Ανατεθειμένου (τώρα: ${name})`}
          onClick={() => setIsEditing(true)}
        >
          Αλλαγή
        </button>
      </span>
    );
  return (
    <AutoSaveForm
      action={updateDeliverable}
      hidden={withoutKey(keepOf(detail), "assigneeId")}
    >
      <select
        className="select"
        name="assigneeId"
        aria-label="Ανατεθειμένος"
        defaultValue={detail.assigneeId ?? ""}
        onChange={submitOnChange}
      >
        <option value="">{NO_ASSIGNEE_LABEL}</option>
        {optionsOf(detail, ctx.assignees ?? []).map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </AutoSaveForm>
  );
}

function DeadlineField({ detail }: PanelProps) {
  const text = detail.deadline
    ? fmtDate(detail.deadline)
    : detail.filmingId
      ? "μετά το Γύρισμα"
      : "χωρίς ημερομηνία";
  if (!detail.can.edit) return <span>{text}</span>;
  return (
    <span className="h2-inline">
      <span>{text}</span>
      <AutoSaveForm
        action={updateDeliverable}
        hidden={withoutKey(keepOf(detail), "deadline")}
      >
        <input
          className="input"
          type="date"
          name="deadline"
          aria-label="Προθεσμία"
          defaultValue={detail.deadline ?? ""}
          onChange={submitOnChange}
        />
      </AutoSaveForm>
    </span>
  );
}

function Signals({ detail }: { detail: DeliverableDetail }) {
  const extra = extraOf(detail.charge);
  return (
    <span className="h2-signals">
      <Badge tone="strong">{STATE_WORDS[detail.state]}</Badge>
      {detail.isLate && <Badge tone="attention">καθυστερεί (εσωτερικά)</Badge>}
      {isReopened(detail) && (
        <Badge tone="attention">ξανάνοιξε μετά την έγκριση</Badge>
      )}
      {detail.client === null && <Badge>Εσωτερική</Badge>}
      {extra && <Badge>έξτρα {extra}</Badge>}
    </span>
  );
}

export function H2Header(props: PanelProps) {
  const { detail, ctx } = props;
  return (
    <header className="h2-header">
      <h1>{detail.title}</h1>
      <Panel label={detail.kind} aside={<Signals detail={detail} />}>
        <dl className="dl">
          <dt>Πελάτης — Παραγωγή</dt>
          <dd>
            <Link href={ctx.productionHref}>
              {clientAndTitle(detail.client, detail.production)}
            </Link>
          </dd>
          {ctx.filmingHref && (
            <>
              <dt>Από Γύρισμα</dt>
              <dd>
                <Link href={ctx.filmingHref}>Άνοιγμα του Γυρίσματος</Link>
              </dd>
            </>
          )}
          <dt>Είδος</dt>
          <dd>{detail.kind}</dd>
          <dt>Ανατεθειμένος</dt>
          <dd>
            <AssigneeField {...props} />
          </dd>
          <dt>Προθεσμία</dt>
          <dd>
            <DeadlineField {...props} />
          </dd>
          <dt>Γύροι αλλαγών</dt>
          <dd>{roundsLabel(detail.roundsUsed, detail.roundsLimit)}</dd>
        </dl>
        <p className="muted">
          Η προθεσμία μετρά σε εργασίμες από το Γύρισμα που έγινε (ή από τη
          δημιουργία). Η καθυστέρηση δεν τρέχει όσο αναμένει πελάτη ή όσο η
          Έκδοση είναι σε έλεγχο.
        </p>
      </Panel>
    </header>
  );
}
