"use client";

import Link from "next/link";
import { useState } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { StateNotice } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { formatMoney } from "../helpers";
import { KIND_LABELS } from "../labels";
import type { ApprovalItem } from "../types";
import { StatusTag } from "./d1-status-tag";
import {
  DecisionForm,
  ResultLine,
  type Decision,
  type Form,
} from "./d4-decision";
import { DeviationBox } from "./d4-details";

import "../../finance/spaces/money-lines.css";
import "./d1-lines.css";
import "./d4.css";

function ItemTags({ item }: { item: ApprovalItem }) {
  return (
    <span className="d1l-tags">
      <StatusTag label={`Αναμένει · ${item.pendingDays} μέρες`} tone="urgent" />
      <StatusTag label={KIND_LABELS[item.kind]} />
      <StatusTag label={`Αναθεώρηση ${item.revision}`} />
      {item.isReminderDue && (
        <StatusTag label="ξαναειδοποιήθηκαν όσοι εγκρίνουν" />
      )}
      {item.isLowMargin === true && (
        <StatusTag label="χαμηλό περιθώριο (δεν θέλει Έγκριση)" tone="urgent" />
      )}
    </span>
  );
}

function QuickActions(props: {
  href: string;
  isDeciding: boolean;
  onChoose: (form: Form) => void;
}) {
  return (
    <span className="ml-quick">
      {!props.isDeciding && (
        <>
          <button
            type="button"
            className="d4l-approve"
            onClick={() => props.onChoose("approve")}
          >
            Εγκρίνω
          </button>
          <button type="button" onClick={() => props.onChoose("reject")}>
            Απορρίπτω
          </button>
        </>
      )}
      <Link href={props.href}>Άνοιγμα για αλλαγές</Link>
    </span>
  );
}

// Μία πρόταση = μία γραμμή (πελάτης, αναμονή, τίτλος, σύνολο, Εγκρίνω/Απορρίπτω) και από κάτω η Παρέκκλιση σε κλειστό κουτί.
function ApprovalCard({
  item,
  canSeeAmounts,
  onDecided,
}: {
  item: ApprovalItem;
  canSeeAmounts: boolean;
  onDecided: (decision: Decision) => void;
}) {
  const [form, setForm] = useState<Form | null>(null);
  const href = hrefOf("D2", { id: item.agreementId });
  return (
    <section className="d4-item">
      <div className="ml-line" data-urgent>
        <span className="ml-thumb" aria-hidden="true">
          {initialsOf(item.clientName)}
        </span>
        <span className="ml-main">
          <ItemTags item={item} />
          <strong>
            <Link className="d1l-title" href={href}>
              {item.title}
            </Link>
          </strong>
          <small>
            {item.clientName} · Υπεύθυνος: {item.managerName ?? "—"}
          </small>
        </span>
        {item.total !== null && (
          <span className="ml-amount">
            {formatMoney(item.total)}
            <small>
              {item.kind === "monthly" ? "σύνολο / μήνα" : "σύνολο εφάπαξ"}
            </small>
          </span>
        )}
        <QuickActions
          href={href}
          isDeciding={form !== null}
          onChoose={setForm}
        />
      </div>
      {form && (
        <DecisionForm
          agreementId={item.agreementId}
          form={form}
          onCancel={() => setForm(null)}
          onDone={(comment) => onDecided({ form, comment })}
        />
      )}
      <DeviationBox item={item} canSeeAmounts={canSeeAmounts} />
    </section>
  );
}

const waitingText = (count: number): string =>
  count === 1 ? "1 πρόταση περιμένει" : `${count} προτάσεις περιμένουν`;

// Η ουρά Εγκρίσεων πάνω στις πραγματικές προτάσεις. Το αποτέλεσμα μιας απόφασης μένει στη θέση του και όταν η πρόταση
// φεύγει από τη λίστα.
export function ApprovalQueue({
  items,
  canSeeAmounts,
}: {
  items: readonly ApprovalItem[];
  canSeeAmounts: boolean;
}) {
  const [decided, setDecided] = useState<
    readonly { item: ApprovalItem; decision: Decision }[]
  >([]);
  const waiting = items.filter(
    (item) =>
      !decided.some((done) => done.item.agreementId === item.agreementId),
  );
  // Η ουρά μένει πάντα στη σελίδα, ώστε η απάντηση στην τελευταία πρόταση να φαίνεται και όταν η λίστα αδειάσει.
  if (waiting.length === 0 && decided.length === 0)
    return (
      <StateNotice kind="empty" title="Καμία πρόταση δεν περιμένει Έγκριση." />
    );
  return (
    <div className="ml-list d4l-queue">
      {decided.map(({ item, decision }) => (
        <ResultLine key={item.agreementId} item={item} decision={decision} />
      ))}
      <p className="muted">
        {waitingText(waiting.length)} Έγκριση. Η Έγκριση δεν λήγει ποτέ· μένει
        εδώ μέχρι να απαντήσει κάποιος.
      </p>
      {waiting.map((item) => (
        <ApprovalCard
          key={item.agreementId}
          item={item}
          canSeeAmounts={canSeeAmounts}
          onDecided={(decision) =>
            setDecided((done) => [...done, { item, decision }])
          }
        />
      ))}
    </div>
  );
}
