"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { labelOf } from "@/spaces/data/spaces";
import { Panel } from "@/spaces/kit/panel";
import { Meter } from "@/spaces/kit/parts";

import { useFilmingCounts } from "./filming-counts";
import { GuideClients } from "./guide-clients";
import {
  flowOf,
  isLast,
  isWait,
  missingAtEnd,
  missingLine,
  missingOf,
  parseStep,
  requiringStep,
  resumeHref,
  stepHref,
  type FilmingCounts,
  type Flow,
} from "./flows";
import {
  forgetActive,
  park,
  parseActive,
  readActive,
  readActiveRaw,
  rememberActive,
  rememberDate,
  rememberFilming,
  subscribeParked,
  unpark,
  type FilmingPlace,
} from "./parked";

import "./flows.css";

// Το URL έχασε τη θέση (αποθήκευση που ανακατευθύνει, αλλαγή εβδομάδας στο Ημερολόγιο): ο οδηγός τη βάζει πίσω
// από τη θέση που κρατά η καρτέλα, αν είμαστε στον σταθμό του βήματος ή εκεί που στέλνει η αποθήκευσή του.
function useResume(hasPlace: boolean, pathname: string, search: string) {
  const router = useRouter();
  useEffect(() => {
    if (hasPlace) return;
    const active = readActive();
    const flow = flowOf(active?.job);
    if (!active || !flow) return;
    const href = resumeHref(flow, active.step, { pathname, search });
    if (href) router.replace(href);
  }, [hasPlace, pathname, search, router]);
}

interface GuideProps {
  flow: Flow;
  step: number;
  pathname: string;
  // Μέλη και αντικείμενα του Γυρίσματος της σελίδας (null = δεν είμαστε σε Γύρισμα).
  counts: FilmingCounts | null;
}

// Το Γύρισμα που κράτησε η καρτέλα (στον server: κανένα).
function useStoredFilming(): FilmingPlace | null {
  const raw = useSyncExternalStore(subscribeParked, readActiveRaw, () => "null");
  return parseActive(raw)?.filming ?? null;
}

// Η μέρα του γυρίσματος: από τη θέση της καρτέλας, ή από το Ημερολόγιο που ήδη δείχνει τη μέρα.
const dateOf = (): string | undefined =>
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

const isAtStationOf = (flow: Flow, step: number, pathname: string) =>
  stepHref(flow, step, { pathname }).split("?")[0] === pathname;

// Το ένα κύριο κουμπί του βήματος: υποβολή της φόρμας του σταθμού, «Εντάξει, περιμένω», «Επόμενο» ή «Τέλος».
// Στο βήμα επιλογής Πελάτη κύρια είναι η λίστα, χωρίς κουμπί.
function PrimaryAction({ flow, step, pathname, counts }: GuideProps) {
  const router = useRouter();
  const current = flow.steps[step - 1];
  const goHome = () => {
    forgetActive();
    router.push("/app");
  };
  const handleNext = () => {
    if (isLast(flow, step)) {
      unpark(flow.id);
      return goHome();
    }
    if (isWait(current)) {
      park({
        job: flow.id,
        step: step + 1,
        reason: "wait",
        at: Date.now(),
        date: dateOf(),
        filming: readActive()?.filming,
      });
      return goHome();
    }
    router.push(stepHref(flow, step + 1, { pathname, date: dateOf() }));
  };
  if (current.picksClient) return null;
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
      disabled={missingOf(current.requires, counts).length > 0}
      onClick={handleNext}
    >
      {isLast(flow, step)
        ? "Τέλος"
        : isWait(current)
          ? "Εντάξει, περιμένω"
          : "Επόμενο"}
    </button>
  );
}

function GuideActions(props: GuideProps) {
  const { flow, step, pathname, counts } = props;
  const router = useRouter();
  const handleExit = () => {
    park({
      job: flow.id,
      step,
      reason: "exit",
      at: Date.now(),
      date: dateOf(),
      filming: readActive()?.filming,
    });
    forgetActive();
    router.push("/app");
  };
  const current = flow.steps[step - 1];
  const missing = current.requires
    ? missingLine(missingOf(current.requires, counts))
    : null;
  const showsStationLink =
    !isAtStationOf(flow, step, pathname) &&
    !current.submits &&
    !isWait(current);
  return (
    <div className="btn-row flow-guide-actions">
      <PrimaryAction {...props} />
      {missing && (
        <span className="flow-guide-missing" role="status">
          {missing}
        </span>
      )}
      {showsStationLink && (
        <Link className="button" href={stepHref(flow, step, { pathname })}>
          Άνοιξε: {labelOf(current.station)}
        </Link>
      )}
      {step > 1 && (
        <Link className="button" href={stepHref(flow, step - 1, { pathname })}>
          Πίσω
        </Link>
      )}
      <button type="button" className="button" onClick={handleExit}>
        Έξοδος
      </button>
    </div>
  );
}

// Το τέλος δεν λέει «με ομάδα και εξοπλισμό» όταν ξέρουμε ότι λείπουν: λέει τι λείπει και γυρνά στο βήμα τους.
function DoneLine({ flow }: { flow: Flow }) {
  const filming = useStoredFilming();
  const missing = missingLine(missingAtEnd(flow, filming));
  const back = requiringStep(flow);
  if (!missing || !filming)
    return (
      <p className="flow-guide-done" role="status">
        {flow.done}
      </p>
    );
  return (
    <p className="flow-guide-missing" role="status">
      {missing} —{" "}
      <Link href={stepHref(flow, back, { pathname: filming.path })}>
        Πίσω στο βήμα {back}
      </Link>
    </p>
  );
}

function Guide(props: GuideProps) {
  const { flow, step } = props;
  const current = flow.steps[step - 1];
  return (
    <div data-spaces className="flow-guide">
      <Panel
        label={`Οδηγός · ${flow.name}`}
        aside={`Βήμα ${step} από ${flow.steps.length}`}
      >
        <Meter label={current.area} used={step} total={flow.steps.length} />
        <p className="flow-guide-question">{current.question}</p>
        <p className="flow-guide-preset">{current.preset}</p>
        {current.picksClient && <GuideClients flow={flow} step={step} />}
        {isLast(flow, step) && <DoneLine flow={flow} />}
        {current.hidden && (
          <details className="flow-guide-more">
            <summary>Περισσότερα</summary>
            <p>{current.hidden}</p>
          </details>
        )}
        <GuideActions {...props} />
      </Panel>
    </div>
  );
}

// Ο οδηγός πάνω από κάθε οθόνη όσο το URL έχει ?job=&step=. Χωρίς θέση ξαναμπαίνει μόνο από τη θέση της καρτέλας.
export function GuideBar() {
  const params = useSearchParams();
  const pathname = usePathname();
  const flow = flowOf(params.get("job"));
  const step = flow ? parseStep(params.get("step"), flow) : 0;
  useResume(flow !== undefined, pathname, params.toString());
  const counts = useFilmingCounts();
  useEffect(() => {
    if (flow) rememberActive(flow.id, step);
  }, [flow, step]);
  // Στη σελίδα του Γυρίσματος ο οδηγός κρατά ποιο είναι και πόσα έχει, για το τέλος και την ουρά.
  const crew = counts?.crew;
  const equipment = counts?.equipment;
  useEffect(() => {
    if (flow && crew !== undefined && equipment !== undefined)
      rememberFilming(flow.id, step, { path: pathname, crew, equipment });
  }, [flow, step, pathname, crew, equipment]);
  return flow ? (
    <Guide flow={flow} step={step} pathname={pathname} counts={counts} />
  ) : null;
}
