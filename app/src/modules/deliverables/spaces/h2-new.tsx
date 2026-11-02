"use client";

import { useState } from "react";

import { createDeliverable } from "../actions-deliverable";
import { formatDateTime } from "../helpers";
import { NO_ASSIGNEE_LABEL, NO_FILMING_LABEL } from "../labels";
import type { DeliverableCandidates, KindCandidate } from "../types";
import { H2Form } from "./h2-form";

import "./h2.css";

// «Νέο Παραδοτέο» (prototype `screens/h2-new.tsx`) πάνω στην πραγματική ενέργεια `createDeliverable`.
// Η βάση δίνει μόνο το υπόλοιπο του είδους (όχι σύνολο/χρησιμοποιήθηκαν) και ορίζει μόνη της την προθεσμία:
// ο μετρητής δείχνει «απομένουν» και το πεδίο «Προθεσμία» λείπει.

interface SpacesNewDeliverableProps {
  productionId: string;
  defaultTitle: string;
  isInternal: boolean;
  candidates: DeliverableCandidates;
}

type Charge = "" | "pending" | "free";

function KindCounter({
  kind,
  isInternal,
}: {
  kind: KindCandidate | undefined;
  isInternal: boolean;
}) {
  if (!kind) return null;
  if (isInternal || kind.balance === null)
    return <p className="muted">Εσωτερική Παραγωγή: δεν υπάρχει Παροχή.</p>;
  return (
    <p className="muted">
      Παροχή της Περιόδου: απομένουν {Math.max(0, kind.balance)}
    </p>
  );
}

// Χωρίς υπόλοιπο: «να αποφασιστεί χρέωση» (γεννά απόφαση χρέωσης) ή «χωρίς χρέωση» με λόγο, όπως η σημερινή φόρμα.
function ExtraChoice() {
  const [charge, setCharge] = useState<Charge>("pending");
  return (
    <div className="h2-warn" role="alert">
      <p>
        Δεν μένει Παροχή αυτού του είδους στην Περίοδο. Διάλεξε πώς μπαίνει το
        Παραδοτέο.
      </p>
      <label className="h2-choice">
        <span>
          <input
            type="radio"
            name="charge"
            value="pending"
            checked={charge === "pending"}
            onChange={() => setCharge("pending")}
          />{" "}
          Έξτρα με χρέωση (η χρέωση αποφασίζεται στα Παραδοτέα)
        </span>
        <span>
          <input
            type="radio"
            name="charge"
            value="free"
            checked={charge === "free"}
            onChange={() => setCharge("free")}
          />{" "}
          Χωρίς χρέωση (απαιτεί λόγο)
        </span>
      </label>
      {charge === "free" && (
        <input
          className="input"
          name="chargeReason"
          aria-label="Λόγος"
          placeholder="Λόγος (υποχρεωτικός)"
          maxLength={2000}
        />
      )}
    </div>
  );
}

export function SpacesNewDeliverable({
  productionId,
  defaultTitle,
  isInternal,
  candidates,
}: SpacesNewDeliverableProps) {
  const [kindId, setKindId] = useState(candidates.kinds[0]?.id ?? "");
  const kind = candidates.kinds.find((item) => item.id === kindId);
  const isShort = !isInternal && (kind?.balance ?? 0) <= 0;
  return (
    <H2Form
      action={createDeliverable}
      submitLabel="Δημιουργία Παραδοτέου"
      hidden={{ productionId }}
      isPrimary
      resetOnSuccess
    >
      <label>
        Τίτλος
        <input
          className="input"
          name="title"
          defaultValue={defaultTitle}
          required
          maxLength={200}
          autoComplete="off"
        />
      </label>
      <label>
        Είδος Παροχής
        <select
          className="select"
          name="kindId"
          value={kindId}
          onChange={(event) => setKindId(event.target.value)}
        >
          {candidates.kinds.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <KindCounter kind={kind} isInternal={isInternal} />
      {isShort && <ExtraChoice key={kindId} />}
      <label>
        Ανατεθειμένος
        <select className="select" name="assigneeId" defaultValue="">
          <option value="">{NO_ASSIGNEE_LABEL}</option>
          {candidates.assignees.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Γύρισμα (προαιρετικό)
        <select className="select" name="filmingId" defaultValue="">
          <option value="">{NO_FILMING_LABEL}</option>
          {candidates.filmings.map((filming) => (
            <option key={filming.id} value={filming.id}>
              {formatDateTime(filming.startsAt)}
            </option>
          ))}
        </select>
      </label>
    </H2Form>
  );
}
