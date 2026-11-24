"use client";

import Link from "next/link";
import { useState } from "react";

import { fmtDate } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { updateDeliverable } from "../actions-deliverable";
import { NO_ASSIGNEE_LABEL } from "../labels";
import type { AssigneeCandidate, DeliverableDetail } from "../types";
import { clientAndTitle } from "./h1-model";
import { H2Box, H2Person } from "./h2-box";
import { AutoSaveForm, submitOnChange } from "./h2-form";
import {
  STATE_WORDS,
  extraOf,
  isReopened,
  roundsLabel,
  type PanelProps,
} from "./h2-model";

// Κεφαλίδα και «Στοιχεία» του H2. Ανατεθειμένος και Προθεσμία αλλάζουν με το deliverable_update,
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
  if (!detail.can.edit || ctx.assignees === null)
    return (
      <span className="h2-inline">
        <H2Person name={name} />
        {name}
      </span>
    );
  // Φαίνεται ένα όνομα· η λίστα ανοίγει μόνο με «Αλλαγή».
  if (!isEditing)
    return (
      <span className="h2-inline">
        <H2Person name={name} />
        {name}
        <span className="ml-quick">
          <button
            type="button"
            aria-label={`Αλλαγή Ανατεθειμένου (τώρα: ${name})`}
            onClick={() => setIsEditing(true)}
          >
            Αλλαγή
          </button>
        </span>
      </span>
    );
  return (
    <AutoSaveForm
      action={updateDeliverable}
      hidden={withoutKey(keepOf(detail), "assigneeId")}
    >
      <select
        className="input"
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

// Η προθεσμία φαίνεται μία φορά: ως κείμενο, και ως πεδίο ημερομηνίας μόνο αφού πατηθεί «Αλλαγή».
function DeadlineField({ detail }: PanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const text = detail.deadline
    ? fmtDate(detail.deadline)
    : detail.filmingId
      ? "μετά το Γύρισμα"
      : "χωρίς ημερομηνία";
  if (!detail.can.edit) return <span>{text}</span>;
  if (!isEditing)
    return (
      <span className="h2-inline">
        <span>{text}</span>
        <span className="ml-quick">
          <button
            type="button"
            aria-label={`Αλλαγή Προθεσμίας (τώρα: ${text})`}
            onClick={() => setIsEditing(true)}
          >
            Αλλαγή
          </button>
        </span>
      </span>
    );
  return (
    <span className="h2-inline">
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
    <>
      {detail.isLate && (
        <span className="ml-tag" data-tone="warn">
          καθυστερεί (εσωτερικά)
        </span>
      )}
      {isReopened(detail) && (
        <span className="ml-tag" data-tone="warn">
          ξανάνοιξε μετά την έγκριση
        </span>
      )}
      {detail.client === null && <span className="ml-tag">Εσωτερική</span>}
      {extra && <span className="ml-tag">έξτρα {extra}</span>}
    </>
  );
}

// Η κεφαλίδα της Σελίδας Παραδοτέου (μορφή της I8): κατάσταση και σήματα, ο τίτλος (το μοναδικό h1), Πελάτης — Παραγωγή.
export function H2Hero({ detail, ctx }: PanelProps) {
  return (
    <header className="ml-hero h2-header">
      <span className="ml-hero-mono" aria-hidden="true">
        {initialsOf(detail.title)}
      </span>
      <div>
        <span className="h2-signals">
          <span className="ml-tag">{STATE_WORDS[detail.state]}</span>
          <Signals detail={detail} />
        </span>
        <h1>{detail.title}</h1>
        <p>
          <Link href={ctx.productionHref}>
            {clientAndTitle(detail.client, detail.production)}
          </Link>
          {` · ${detail.kind}`}
        </p>
      </div>
    </header>
  );
}

// Τα στοιχεία του Παραδοτέου: Ανατεθειμένος και Προθεσμία αλλάζουν επί τόπου.
export function H2Facts(props: PanelProps) {
  const { detail, ctx } = props;
  return (
    <H2Box
      title="Στοιχεία"
      hint={roundsLabel(detail.roundsUsed, detail.roundsLimit)}
    >
      <dl className="ml-kv">
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
        δημιουργία). Η καθυστέρηση δεν τρέχει όσο αναμένει πελάτη ή όσο η Έκδοση
        είναι σε έλεγχο.
      </p>
    </H2Box>
  );
}
