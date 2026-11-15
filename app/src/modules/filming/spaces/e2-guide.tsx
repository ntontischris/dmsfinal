"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, type FormEvent } from "react";

import { INITIAL_FORM_STATE } from "@/lib/form-state";
import { hrefOf } from "@/spaces/data/screens";
import { recordClosed } from "@/spaces/flows/later";
import { clearRun } from "@/spaces/flows/loop-run";
import { forgetActive, unpark } from "@/spaces/flows/parked";
import { Panel } from "@/spaces/kit/panel";

import { answerRequest, answerWithReason } from "../actions-answer";
import {
  ANSWER_LABELS,
  ANSWERS,
  EGKRINO_JOB,
  EGKRINO_STEPS,
  KIND_TITLES,
  filmingGuideHref,
  type Answer,
  type Focus,
  type GuideRequest,
} from "./e2-guide-model";

// Ο οδηγός «Εγκρίνω αιτήματα γυρίσματος» πάνω στο E2: βήμα 1 (μία κάρτα, τρεις απαντήσεις του είδους) και 2γ (λόγος).
// Το κύριο κουμπί του οδηγού υποβάλλει τη φόρμα «e2-answer» ή «e2-reason».

function RequestFacts({ request }: { request: GuideRequest }) {
  return (
    <dl className="dl">
      <dt>Πελάτης</dt>
      <dd>
        {request.clientName} · {request.production}
      </dd>
      <dt>{request.newWhen ? "Τώρα" : "Πότε"}</dt>
      <dd>{request.when}</dd>
      {request.newWhen && (
        <>
          <dt>Ζητά</dt>
          <dd>{request.newWhen}</dd>
        </>
      )}
      {request.reason && (
        <>
          <dt>Λόγος</dt>
          <dd>«{request.reason}»</dd>
        </>
      )}
      {request.kind === "cancel" && (
        <>
          <dt>Αν δεχτείς</dt>
          <dd>
            {request.burns
              ? "Το Γύρισμα ακυρώνεται και η Παροχή καίγεται (η Συμφωνία το ορίζει)."
              : "Το Γύρισμα ακυρώνεται και η Παροχή επιστρέφει."}
          </dd>
        </>
      )}
    </dl>
  );
}

interface AnswerChoicesProps {
  request: GuideRequest;
  lock: string | null;
  approveLine: string | null;
  answer: Answer;
  onAnswer: (answer: Answer) => void;
}

function AnswerChoices({ request, lock, approveLine, answer, onAnswer }: AnswerChoicesProps) {
  return (
    <fieldset className="stack">
      <legend className="kit-label">Η απάντησή σου</legend>
      {ANSWERS.map((option) => (
        <label key={option} className="stack">
          <span>
            <input
              type="radio"
              name="answer"
              value={option}
              checked={answer === option}
              disabled={option === "approve" && lock !== null}
              onChange={() => onAnswer(option)}
            />{" "}
            {ANSWER_LABELS[request.kind][option]}
          </span>
          {option === "approve" && lock === null && approveLine && (
            <span className="muted">{approveLine}</span>
          )}
          {option === "approve" && lock && <span className="muted">Κλειδωμένο: {lock}</span>}
        </label>
      ))}
    </fieldset>
  );
}

function MoreLinks({ request }: { request: GuideRequest }) {
  return (
    <details>
      <summary>Περισσότερα</summary>
      <ul className="stack">
        <li>
          <Link href={hrefOf("E3", { id: request.id })}>Δες το Γύρισμα</Link>
        </li>
        {request.kind === "booking" && (
          <li>
            <Link href="/app/filming/crew-templates">Αλλάζω ποιοι πάνε πριν εγκρίνω</Link>
          </li>
        )}
        <li>
          <Link href={hrefOf("E1")}>Όλα τα Γυρίσματα</Link>
        </li>
      </ul>
    </details>
  );
}

interface AnswerCardProps {
  focus: Focus;
  lock: string | null;
  approveLine: string | null;
}

// Βήμα 1: η κάρτα του αιτήματος. Η προεπιλογή είναι η συνηθισμένη απάντηση· με κλειδωμένο «Εγκρίνω», η πρόταση ώρας.
export function E2AnswerCard({ focus, lock, approveLine }: AnswerCardProps) {
  const { request, index, total } = focus;
  const [answer, setAnswer] = useState<Answer>(lock ? "offer" : "approve");
  const [state, formAction, isPending] = useActionState(answerRequest, INITIAL_FORM_STATE);
  return (
    <Panel label={`Αίτημα ${index} από ${total} · ${KIND_TITLES[request.kind]}`}>
      <form id="e2-answer" action={formAction} className="stack" aria-busy={isPending}>
        <input type="hidden" name="filmingId" value={request.id} />
        <input type="hidden" name="kind" value={request.kind} />
        <input type="hidden" name="kindLabel" value={request.kindLabel} />
        {request.replaces && <p className="e-info">Αντικαθιστά το προηγούμενο αίτημα του ίδιου Γυρίσματος.</p>}
        <RequestFacts request={request} />
        {lock && (
          <p className="e-warn" role="alert">
            {lock}
          </p>
        )}
        <AnswerChoices request={request} lock={lock} approveLine={approveLine} answer={answer} onAnswer={setAnswer} />
        {state.error && (
          <p className="e-warn" role="alert">
            {state.error}
          </p>
        )}
        <MoreLinks request={request} />
      </form>
    </Panel>
  );
}

const REASON_LABELS: Readonly<Record<GuideRequest["kind"], string>> = {
  booking: "Γιατί απορρίπτεις την κράτηση; (τον λόγο τον βλέπει ο Πελάτης)",
  reschedule: "Γιατί απορρίπτεις τη μετάθεση; (τον λόγο τον βλέπει ο Πελάτης)",
  cancel: "Γιατί αρνείσαι την ακύρωση; (τον λόγο τον βλέπει ο Πελάτης)",
};

// Βήμα 2γ: ο λόγος. Χωρίς λόγο η φόρμα δεν φεύγει (και η βάση ξαναελέγχει).
export function E2ReasonCard({ request }: { request: GuideRequest }) {
  const [state, formAction, isPending] = useActionState(answerWithReason, INITIAL_FORM_STATE);
  return (
    <Panel label={`${KIND_TITLES[request.kind]} · ${request.clientName}`}>
      <form id="e2-reason" action={formAction} className="stack" aria-busy={isPending}>
        <input type="hidden" name="filmingId" value={request.id} />
        <input type="hidden" name="kind" value={request.kind} />
        <RequestFacts request={request} />
        <label className="stack">
          {REASON_LABELS[request.kind]}
          <textarea className="input" name="reason" rows={3} maxLength={500} required />
        </label>
        {state.error && (
          <p className="e-warn" role="alert">
            {state.error}
          </p>
        )}
        <Link href={filmingGuideHref(request.id, EGKRINO_STEPS.offer)}>
          Θες να του προτείνεις ώρα αντί γι&apos; αυτό;
        </Link>
      </form>
    </Panel>
  );
}

// Δεν περιμένει κανένα αίτημα: το κύριο κουμπί του οδηγού κλείνει τη δουλειά (όπως το «Τέλος») και γυρνά στη Σήμερα.
export function E2GuideDone() {
  const router = useRouter();
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    unpark(EGKRINO_JOB);
    recordClosed(EGKRINO_JOB);
    clearRun(EGKRINO_JOB);
    forgetActive();
    router.push("/app");
  };
  return (
    <form id="e2-answer" onSubmit={handleSubmit}>
      <p className="e-info" role="status">
        Απάντησες σε όλα τα αιτήματα. Πάτα το κουμπί του οδηγού για να κλείσει η δουλειά.
      </p>
    </form>
  );
}

// Το αίτημα του 2γ απαντήθηκε ήδη (π.χ. από άλλη καρτέλα): ο οδηγός γυρνά στο επόμενο.
export function E2ReasonGone({ nextHref }: { nextHref: string }) {
  return (
    <p className="e-info" role="status">
      Αυτό το αίτημα απαντήθηκε ήδη. <Link href={nextHref}>Στο επόμενο αίτημα</Link>
    </p>
  );
}
