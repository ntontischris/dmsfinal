"use client";

import Link from "next/link";
import { useState, type HTMLAttributes } from "react";

import { useKeptForm } from "@/lib/use-kept-form";
import { Due, Person } from "@/spaces/kit/parts";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import {
  closeOpportunityLost,
  moveOpportunityStage,
} from "../actions-opportunities";
import type { ListItem } from "../types";
import type { BoardCard } from "./b3-adapter";
import { initialsOf, lastContactText } from "./b3-line-text";

// Μετακίνηση σε Στάδιο με την πραγματική ενέργεια: η αλλαγή στη λίστα στέλνει αμέσως.
function MoveStage({
  card,
  stages,
}: {
  card: BoardCard;
  stages: readonly ListItem[];
}) {
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(moveOpportunityStage);
  const selectable = stages.filter(
    (stage) => !stage.isRetired || stage.id === card.stageId,
  );
  return (
    <form ref={formRef} onSubmit={onSubmit} style={{ display: "contents" }}>
      <input type="hidden" name="opportunityId" value={card.id} />
      <select
        className="select"
        aria-label="Μετακίνηση σε Στάδιο"
        name="stageId"
        defaultValue={card.stageId}
        disabled={isPending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {selectable.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.label}
          </option>
        ))}
      </select>
      {state.error && (
        <span className="note" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

function CloseLost({
  card,
  reasons,
}: {
  card: BoardCard;
  reasons: readonly ListItem[];
}) {
  const [isClosing, setIsClosing] = useState(false);
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(closeOpportunityLost);
  if (!isClosing)
    return (
      <button
        type="button"
        className="button"
        onClick={() => setIsClosing(true)}
      >
        Κλείσιμο ως χαμένη
      </button>
    );
  return (
    <form ref={formRef} onSubmit={onSubmit} style={{ display: "contents" }}>
      <input type="hidden" name="opportunityId" value={card.id} />
      <select
        className="select"
        aria-label="Λόγος απώλειας"
        name="lossReasonId"
        defaultValue=""
        disabled={isPending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        <option value="" disabled>
          Λόγος απώλειας (υποχρεωτικός)
        </option>
        {reasons
          .filter((reason) => !reason.isRetired)
          .map((reason) => (
            <option key={reason.id} value={reason.id}>
              {reason.label}
            </option>
          ))}
      </select>
      {state.error && (
        <span className="note" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

// Το σώμα της γραμμής: ετικέτα (Πηγή), τίτλος, Πελάτης και πρόβλεψη σε μικρά.
function CardMain({ card }: { card: BoardCard }) {
  return (
    <span className="ml-main">
      {card.source && <span className="ml-tag b3-source">{card.source}</span>}
      <strong>
        <Link href={card.href} className="b3-title">
          {card.title}
        </Link>
      </strong>
      <small className="b3-client">{card.clientName}</small>
      {card.forecast && <small className="b3-forecast">{card.forecast}</small>}
    </span>
  );
}

// Επόμενο βήμα, τελευταία επαφή, Υπεύθυνος, προθεσμία και Έκβαση: η δουλειά της Ευκαιρίας κάτω από το σώμα.
function CardWork({ card, today }: { card: BoardCard; today: string }) {
  const isOpen = card.outcome === "open";
  return (
    <>
      {card.nextStep && isOpen && (
        <p className="b3-step">
          Επόμενο βήμα: {card.nextStep}{" "}
          {card.isForgotten && <Badge tone="attention">Ξεχασμένη</Badge>}
        </p>
      )}
      {isOpen && (
        <small className="b3-contact">
          {lastContactText(card.lastContact, today)}
        </small>
      )}
      <div className="b3-foot">
        <Person name={card.owner} />
        {card.nextStepDue && (
          <Due isLate={card.isForgotten}>
            {card.isForgotten ? "έληξε" : "→"} {fmtDate(card.nextStepDue)}
          </Due>
        )}
      </div>
      {card.outcome === "lost" && card.lostReason && (
        <Badge>Λόγος απώλειας: {card.lostReason}</Badge>
      )}
      {card.outcome === "won" && <Badge tone="ok">Κερδισμένη</Badge>}
    </>
  );
}

// Μία Ευκαιρία ως γραμμή-κάρτα (λεξιλόγιο των «Χρημάτων»): πλακίδιο, ετικέτα, τίτλος, ποσό, και από κάτω η δουλειά.
// Η κουκκίδα επείγοντος (data-urgent) φαίνεται όταν πέρασε το Επόμενο βήμα.
export function BoardCardLine({
  card,
  today,
  stages,
  lossReasons,
  dragProps,
}: {
  card: BoardCard;
  today: string;
  stages: readonly ListItem[];
  lossReasons: readonly ListItem[];
  dragProps?: HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <div
      {...dragProps}
      className="kcard b3-card ml-line"
      data-forgotten={card.isForgotten}
      data-urgent={card.isForgotten || undefined}
      data-outcome={card.outcome}
    >
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(card.clientName)}
      </span>
      <CardMain card={card} />
      {card.amount && <span className="ml-amount">{card.amount}</span>}
      <div className="b3-more">
        <CardWork card={card} today={today} />
        {card.canWork && (
          <div className="b3-controls">
            <MoveStage card={card} stages={stages} />
            <CloseLost card={card} reasons={lossReasons} />
          </div>
        )}
      </div>
    </div>
  );
}
