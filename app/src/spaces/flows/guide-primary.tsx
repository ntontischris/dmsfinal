"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";

import { labelOf } from "@/spaces/data/spaces";

import {
  isWait,
  missingOf,
  nextOf,
  oldestHref,
  primaryLabelOf,
  stepHref,
  type FilmingCounts,
  type Flow,
} from "./flows";
import { returnFrom } from "./from-guide";
import type { Loop } from "./guide-loop";
import { recordClosed } from "./later";
import { clearRun } from "./loop-run";
import { forgetActive, park, readActive, rememberDate, unpark } from "./parked";

export interface GuideProps {
  flow: Flow;
  step: number;
  pathname: string;
  // Μέλη και αντικείμενα του Γυρίσματος της σελίδας (null = δεν είμαστε σε Γύρισμα).
  counts: FilmingCounts | null;
  // Η δουλειά τελείωσε: τελευταίο βήμα, ή οδηγός που γυρνά χωρίς άλλη γραμμή.
  isFinished: boolean;
  // Η γραμμή που περιμένει πιο πολύ (οδηγός που γυρνά, βήμα 1) και το είδος της (σε ποιο βήμα ανοίγει).
  oldest: string | undefined;
  oldestKind?: string;
  // Ο γύρος του οδηγού που γυρνά.
  loop?: Loop;
}

// Η μέρα του γυρίσματος: από τη θέση της καρτέλας, ή από το Ημερολόγιο που ήδη δείχνει τη μέρα.
export const dateOf = (): string | undefined =>
  readActive()?.date ??
  new URLSearchParams(window.location.search).get("date") ??
  undefined;

// Πριν υποβληθεί η φόρμα του σταθμού, ο οδηγός κρατά τη μέρα της (για το Ημερολόγιο του τελευταίου βήματος).
const keepFormDate = (flow: Flow, step: number, formId: string) => {
  const form = document.getElementById(formId);
  const field =
    form instanceof HTMLFormElement ? form.elements.namedItem("date") : null;
  if (field instanceof HTMLInputElement && field.value)
    rememberDate(flow.id, step, field.value);
};

export const isAtStationOf = (flow: Flow, step: number, pathname: string) =>
  stepHref(flow, step, { pathname }).split("?")[0] === pathname;

// Η σελίδα λέει αν υπάρχει ανοιχτό Αίτημα ([data-flow-request-open="true"]): οι επιλογές «when» ακούν κάθε αλλαγή της.
const subscribePage = (listener: () => void): (() => void) => {
  const observer = new MutationObserver(listener);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-flow-request-open"],
  });
  return () => observer.disconnect();
};

const hasOpenRequest = (): boolean =>
  document.querySelector('[data-flow-request-open="true"]') !== null;

function useHasOpenRequest(): boolean {
  return useSyncExternalStore(subscribePage, hasOpenRequest, () => false);
}

// Επιλογές αντί για «Επόμενο»: η πρώτη κύρια, εκτός αν κύριο είναι το κουμπί του σταθμού (π.χ. «Αποστολή»).
// Η απάντηση γράφεται στον σταθμό· η επιλογή λέει πού συνεχίζει. «Το αφήνω για μετά» πάει στην επόμενη γραμμή.
function Choices({ flow, step, pathname, loop }: GuideProps) {
  const current = flow.steps[step - 1];
  const hasRequest = useHasOpenRequest();
  const choices = (current?.choices ?? []).filter(
    (choice) => choice.when !== "openRequest" || hasRequest,
  );
  const isPrimary = (index: number) =>
    index === 0 && current?.isStationPrimary !== true ? "true" : undefined;
  return choices.map((choice, index) =>
    choice.skips && loop ? (
      <button
        key={choice.label}
        type="button"
        className="button"
        data-primary={isPrimary(index)}
        onClick={loop.skip}
      >
        {choice.label}
      </button>
    ) : (
      <Link
        key={choice.label}
        className="button"
        data-primary={isPrimary(index)}
        href={stepHref(flow, choice.to, { pathname })}
        onClick={flow.isLoop && choice.to === 1 ? loop?.handled : undefined}
      >
        {choice.label}
      </Link>
    ),
  );
}

function useHandleNext({ flow, step, pathname, isFinished, loop }: GuideProps) {
  const router = useRouter();
  const current = flow.steps[step - 1];
  const goHome = (href = "/app") => {
    forgetActive();
    router.push(href);
  };
  return async () => {
    if (isFinished) {
      await unpark(flow.id);
      recordClosed(flow.id);
      if (flow.isLoop) clearRun(flow.id);
      // Οδηγός μέσα σε οδηγό: το «Τέλος» γυρνά σε αυτόν που μας έστειλε (π.χ. στη λίστα του «Ξεκινώ τη μέρα μου»).
      return goHome(returnFrom(flow.id, step) ?? "/app");
    }
    const next = nextOf(flow, step) ?? step;
    if (flow.isLoop && next === 1) loop?.handled();
    if (isWait(current) && current.then === undefined) {
      await park({
        job: flow.id,
        step: next,
        reason: "wait",
        at: Date.now(),
        date: dateOf(),
        filming: readActive()?.filming,
      });
      return goHome();
    }
    router.push(stepHref(flow, next, { pathname, date: dateOf() }));
  };
}

// Το ένα κύριο κουμπί του βήματος: υποβολή της φόρμας του σταθμού, επιλογές, «Ξεκίνα από τον πιο παλιό»,
// «Εντάξει, περιμένω», «Επόμενο» ή «Τέλος». Στο βήμα επιλογής Πελάτη κύρια είναι η λίστα, χωρίς κουμπί.
export function PrimaryAction(props: GuideProps) {
  const { flow, step, pathname, counts, isFinished } = props;
  const handleNext = useHandleNext(props);
  const current = flow.steps[step - 1];
  const start = oldestHref(flow, step, props.oldest, props.oldestKind);
  if (current.picksClient) return null;
  if (!isFinished && start)
    return (
      <Link className="button" data-primary="true" href={start}>
        Ξεκίνα από τον πιο παλιό
      </Link>
    );
  if (!isFinished && current.choices) return <Choices {...props} />;
  const { submits } = current;
  if (!isFinished && submits && isAtStationOf(flow, step, pathname))
    return (
      <button
        type="submit"
        form={submits.form}
        className="button flow-guide-submit"
        data-primary="true"
        onClick={() => keepFormDate(flow, step, submits.form)}
      >
        {submits.label}
      </button>
    );
  if (!isFinished && submits)
    return (
      <Link
        className="button"
        data-primary="true"
        href={stepHref(flow, step, { pathname })}
      >
        Άνοιξε: {labelOf(current.station)}
      </Link>
    );
  return (
    <button
      type="button"
      className="button"
      data-primary="true"
      disabled={!isFinished && missingOf(current.requires, counts).length > 0}
      onClick={() => void handleNext()}
    >
      {primaryLabelOf(flow, step, isFinished)}
    </button>
  );
}
