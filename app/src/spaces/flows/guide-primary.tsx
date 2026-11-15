"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

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
import { recordClosed } from "./later";
import { forgetActive, park, readActive, rememberDate, unpark } from "./parked";

export interface GuideProps {
  flow: Flow;
  step: number;
  pathname: string;
  // Μέλη και αντικείμενα του Γυρίσματος της σελίδας (null = δεν είμαστε σε Γύρισμα).
  counts: FilmingCounts | null;
  // Η δουλειά τελείωσε: τελευταίο βήμα, ή οδηγός που γυρνά χωρίς άλλη γραμμή.
  isFinished: boolean;
  // Η γραμμή που περιμένει πιο πολύ (οδηγός που γυρνά, βήμα 1).
  oldest: string | undefined;
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

// Επιλογές αντί για «Επόμενο»: η πρώτη κύρια. Η απάντηση γράφεται στον σταθμό· η επιλογή λέει πού συνεχίζει.
function Choices({ flow, step, pathname }: GuideProps) {
  const choices = flow.steps[step - 1]?.choices ?? [];
  return choices.map((choice, index) => (
    <Link
      key={choice.label}
      className="button"
      data-primary={index === 0 ? "true" : undefined}
      href={stepHref(flow, choice.to, { pathname })}
    >
      {choice.label}
    </Link>
  ));
}

function useHandleNext({ flow, step, pathname, isFinished }: GuideProps) {
  const router = useRouter();
  const current = flow.steps[step - 1];
  const goHome = () => {
    forgetActive();
    router.push("/app");
  };
  return () => {
    if (isFinished) {
      unpark(flow.id);
      recordClosed(flow.id);
      return goHome();
    }
    const next = nextOf(flow, step) ?? step;
    if (isWait(current) && current.then === undefined) {
      park({
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
  const start = oldestHref(flow, step, props.oldest);
  if (current.picksClient) return null;
  if (!isFinished && start)
    return (
      <Link className="button" data-primary="true" href={start}>
        Ξεκίνα από τον πιο παλιό
      </Link>
    );
  if (!isFinished && current.choices) return <Choices {...props} />;
  const { submits } = current;
  if (submits && isAtStationOf(flow, step, pathname))
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
  if (submits)
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
      onClick={handleNext}
    >
      {primaryLabelOf(flow, step, isFinished)}
    </button>
  );
}
