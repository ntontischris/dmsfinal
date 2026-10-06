"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/screens/shared";

import "./d5.css";

export interface ApprovalItem {
  id: string;
  clientName: string;
  title: string;
  kind: "μηνιαία" | "εφάπαξ";
  editorHref: string;
  owner: string;
  revision: number;
  pendingDays: number;
  deviations: readonly string[];
  lines: readonly {
    id: string;
    description: string;
    catalog: string | null;
    price: string;
    isBelow: boolean;
  }[];
  isLowMargin: boolean;
  previousApproval: { revision: number; by: string; comment: string } | null;
}

type Decision = { kind: "εγκρίθηκε" | "απορρίφθηκε"; comment: string };
type Form = "approve" | "reject" | null;

const REMIND_AFTER_DAYS = 2; // Μετά από 2 εργάσιμες ξαναειδοποιούνται όσοι εγκρίνουν.

function LinesTable({ lines }: { lines: ApprovalItem["lines"] }) {
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Γραμμή</th>
          <th className="num">Κατάλογος</th>
          <th className="num">Πρόταση</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((line) => (
          <tr key={line.id}>
            <td data-label="Γραμμή">{line.description}</td>
            <td data-label="Κατάλογος" className="num">
              {line.catalog ?? "ελεύθερη γραμμή"}
            </td>
            <td data-label="Πρόταση" className="num">
              {line.isBelow ? <strong>{line.price}</strong> : line.price}
              {line.isBelow && " ↓"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface DecisionFormProps {
  form: "approve" | "reject";
  onCancel: () => void;
  onDecide: (decision: Decision) => void;
}

function DecisionForm({ form, onCancel, onDecide }: DecisionFormProps) {
  const [comment, setComment] = useState("");
  const isReject = form === "reject";
  return (
    <div className="stack">
      <label className="stack">
        {isReject
          ? "Σχόλιο (υποχρεωτικό: τι να αλλάξει)"
          : "Σχόλιο (προαιρετικό)"}
        <textarea
          className="input"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary={!isReject}
          data-danger={isReject}
          disabled={isReject && !comment.trim()}
          onClick={() =>
            onDecide({
              kind: isReject ? "απορρίφθηκε" : "εγκρίθηκε",
              comment: comment.trim(),
            })
          }
        >
          {isReject ? "Απορρίπτω" : "Εγκρίνω"}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}

function ResultLine({
  item,
  decision,
}: {
  item: ApprovalItem;
  decision: Decision;
}) {
  return (
    <section className="card d4-result" role="status">
      <Badge tone={decision.kind === "εγκρίθηκε" ? "strong" : "attention"}>
        {decision.kind}
      </Badge>
      <p>
        <strong>{item.clientName}</strong> · {item.title} · αναθεώρηση{" "}
        {item.revision}
        {decision.comment && ` · «${decision.comment}»`}
      </p>
      <p className="muted">
        Ειδοποιήθηκε ο/η {item.owner}.{" "}
        {decision.kind === "εγκρίθηκε"
          ? "Μπορεί τώρα να τη στείλει."
          : "Αναθεωρεί και ξαναζητά Έγκριση."}{" "}
        (prototype: δεν αποθηκεύεται)
      </p>
    </section>
  );
}

function ItemHeader({ item }: { item: ApprovalItem }) {
  return (
    <>
      <div className="card-title">
        <h2>
          {item.clientName} · <Link href={item.editorHref}>{item.title}</Link>
        </h2>
        <span className="btn-row">
          <Badge>{item.kind}</Badge>
          <Badge>Αναθεώρηση {item.revision}</Badge>
          <Badge tone="attention">Αναμένει · {item.pendingDays} μέρες</Badge>
          {item.pendingDays > REMIND_AFTER_DAYS && (
            <Badge>ξαναειδοποιήθηκαν όσοι εγκρίνουν</Badge>
          )}
          {item.isLowMargin && (
            <Badge tone="attention">χαμηλό περιθώριο (δεν θέλει Έγκριση)</Badge>
          )}
        </span>
      </div>
      <p className="muted">Υπεύθυνος: {item.owner}</p>
    </>
  );
}

function ApprovalCard({ item }: { item: ApprovalItem }) {
  const [form, setForm] = useState<Form>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  if (decision) return <ResultLine item={item} decision={decision} />;

  const previous = item.previousApproval;
  return (
    <section className="card">
      <ItemHeader item={item} />
      <h3>Παρέκκλιση</h3>
      <ul className="list">
        {item.deviations.map((deviation) => (
          <li key={deviation}>{deviation}</li>
        ))}
      </ul>
      <LinesTable lines={item.lines} />
      {previous && (
        <p className="note">
          Η αναθεώρηση {previous.revision} εγκρίθηκε από {previous.by}
          {previous.comment && `: «${previous.comment}»`} — η νέα βαθαίνει την
          Παρέκκλιση.
        </p>
      )}
      {form ? (
        <DecisionForm
          form={form}
          onCancel={() => setForm(null)}
          onDecide={setDecision}
        />
      ) : (
        <div className="btn-row">
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={() => setForm("approve")}
          >
            Εγκρίνω
          </button>
          <button
            type="button"
            className="button"
            data-danger="true"
            onClick={() => setForm("reject")}
          >
            Απορρίπτω
          </button>
          <Link className="button" href={item.editorHref}>
            Άνοιγμα για αλλαγές
          </Link>
        </div>
      )}
    </section>
  );
}

export function ApprovalQueue({ items }: { items: readonly ApprovalItem[] }) {
  return (
    <>
      <p className="muted">
        {items.length === 1
          ? "1 πρόταση περιμένει"
          : `${items.length} προτάσεις περιμένουν`}{" "}
        Έγκριση. Η Έγκριση δεν λήγει ποτέ· μένει εδώ μέχρι να απαντήσει κάποιος.
      </p>
      {items.map((item) => (
        <ApprovalCard key={item.id} item={item} />
      ))}
    </>
  );
}
