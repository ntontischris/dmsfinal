"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { labelOf } from "@/spaces/data/spaces";
import { Panel } from "@/spaces/kit/panel";
import { Meter } from "@/spaces/kit/parts";

import { useFilmingCounts } from "./filming-counts";
import { clearFrom, isAppHref, rememberFrom } from "./from-guide";
import { GuideClients } from "./guide-clients";
import { BackToFrom, LoopLeftover, useLoop } from "./guide-loop";
import { GuidePreset } from "./guide-preset";
import {
  dateOf,
  isAtStationOf,
  PrimaryAction,
  type GuideProps,
} from "./guide-primary";
import {
  depthOf,
  flowOf,
  isLast,
  isWait,
  markOf,
  missingAtEnd,
  missingLine,
  missingOf,
  parseStep,
  prevOf,
  requiringStep,
  resumeHref,
  stepHref,
  totalOf,
  type Flow,
} from "./flows";
import {
  forgetActive,
  park,
  parseActive,
  readActive,
  readActiveRaw,
  rememberActive,
  rememberFilming,
  subscribeParked,
  type FilmingPlace,
} from "./parked";

import { XEKINO_JOB } from "./flow-xekino";
import { XekinoBar } from "./xekino-bar";

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

// Οδηγός που άνοιξε από άλλον οδηγό (?from=): η καρτέλα κρατά πού γυρνά.
function useFromParam(
  flow: Flow | undefined,
  from: string | null,
  step: string | null,
) {
  useEffect(() => {
    if (!flow || !from || !isAppHref(from)) return;
    rememberFrom(flow.id, { href: from, step: parseStep(step, flow) });
  }, [flow, from, step]);
}

// Το Γύρισμα που κράτησε η καρτέλα (στον server: κανένα).
function useStoredFilming(): FilmingPlace | null {
  const raw = useSyncExternalStore(
    subscribeParked,
    readActiveRaw,
    () => "null",
  );
  return parseActive(raw)?.filming ?? null;
}

function GuideActions(props: GuideProps) {
  const { flow, step, pathname, counts } = props;
  const router = useRouter();
  const handleExit = async () => {
    await park({
      job: flow.id,
      step,
      reason: "exit",
      at: Date.now(),
      date: dateOf(),
      filming: readActive()?.filming,
    });
    forgetActive();
    clearFrom(flow.id);
    router.push("/app");
  };
  const current = flow.steps[step - 1];
  const missing = current.requires
    ? missingLine(missingOf(current.requires, counts))
    : null;
  const back = prevOf(flow, step);
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
      {back !== null && (
        <Link className="button" href={stepHref(flow, back, { pathname })}>
          Πίσω
        </Link>
      )}
      <BackToFrom flow={flow} step={step} />
      <button type="button" className="button" onClick={() => void handleExit()}>
        Έξοδος
      </button>
    </div>
  );
}

// Το τέλος δεν λέει «με ομάδα και εξοπλισμό» όταν ξέρουμε ότι λείπουν: λέει τι λείπει και γυρνά στο βήμα τους.
// Ο οδηγός που γυρνά λέει τη φράση του με τους αριθμούς του γύρου.
function DoneLine({ flow, text }: { flow: Flow; text: string }) {
  const filming = useStoredFilming();
  const missing = missingLine(missingAtEnd(flow, filming));
  const back = requiringStep(flow);
  if (!missing || !filming)
    return (
      <p className="flow-guide-done" role="status">
        {text}
      </p>
    );
  return (
    <p className="flow-guide-missing" role="status">
      {missing} —{" "}
      <Link href={stepHref(flow, back, { pathname: filming.path })}>
        Πίσω στο βήμα {markOf(flow, back)}
      </Link>
    </p>
  );
}

function GuideMore({ flow, step }: { flow: Flow; step: number }) {
  const current = flow.steps[step - 1];
  if (!current.hidden && !current.links) return null;
  return (
    <details className="flow-guide-more">
      <summary>Περισσότερα</summary>
      {current.hidden && <p>{current.hidden}</p>}
      {current.links?.map((link) => (
        <p key={link.href}>
          <Link href={link.href}>{link.label}</Link>
        </p>
      ))}
    </details>
  );
}

const asideOf = (flow: Flow, step: number, counter: string | null) => {
  const place = `Βήμα ${markOf(flow, step)} από ${totalOf(flow)}`;
  return counter ? `${counter} · ${place}` : place;
};

function Guide(props: GuideProps) {
  const { flow, step, isFinished, loop } = props;
  const current = flow.steps[step - 1];
  // Ο οδηγός που γυρνά τελείωσε: μόνο η φράση ολοκλήρωσης και το «Τέλος».
  const isLoopDone = isFinished && flow.isLoop === true;
  const hasLeftover =
    !isFinished && loop?.state?.next === null && loop.state.skippedLeft > 0;
  return (
    <div data-spaces className="flow-guide">
      <Panel
        label={`Οδηγός · ${flow.name}`}
        aside={isLoopDone ? "Τέλος" : asideOf(flow, step, loop?.counter ?? null)}
      >
        <Meter
          label={current.area}
          used={isLoopDone ? totalOf(flow) : depthOf(flow, step)}
          total={totalOf(flow)}
        />
        {!isLoopDone && (
          <>
            <p className="flow-guide-question">{current.question}</p>
            <GuidePreset text={current.preset} />
          </>
        )}
        {current.picksClient && <GuideClients flow={flow} step={step} />}
        {isFinished && <DoneLine flow={flow} text={loop?.doneText ?? flow.done} />}
        {hasLeftover && loop && <LoopLeftover loop={loop} />}
        {!isLoopDone && <GuideMore flow={flow} step={step} />}
        <GuideActions {...props} />
      </Panel>
    </div>
  );
}

interface PlacedProps {
  flow: Flow;
  step: number;
  pathname: string;
}

// Ο οδηγός που γυρνά: στο βήμα 1 διαβάζει τις γραμμές του· χωρίς γραμμή που περιμένει (ούτε αφημένη για μετά), τελείωσε.
function PlacedGuide({ flow, step, pathname }: PlacedProps) {
  const counts = useFilmingCounts();
  const loop = useLoop(flow, step, pathname);
  const next = loop.state?.next;
  const isFinished =
    isLast(flow, step) || loop.state?.count === 0;
  // Στη σελίδα του Γυρίσματος ο οδηγός κρατά ποιο είναι και πόσα έχει, για το τέλος και την ουρά.
  const crew = counts?.crew;
  const equipment = counts?.equipment;
  useEffect(() => {
    rememberActive(flow.id, step);
  }, [flow, step]);
  useEffect(() => {
    if (crew !== undefined && equipment !== undefined)
      rememberFilming(flow.id, step, { path: pathname, crew, equipment });
  }, [flow, step, pathname, crew, equipment]);
  return (
    <Guide
      flow={flow}
      step={step}
      pathname={pathname}
      counts={counts}
      isFinished={isFinished}
      oldest={next?.href}
      oldestKind={next?.kind}
      loop={flow.isLoop ? loop : undefined}
    />
  );
}

// Ο οδηγός πάνω από κάθε οθόνη όσο το URL έχει ?job=&step=. Χωρίς θέση ξαναμπαίνει μόνο από τη θέση της καρτέλας.
export function GuideBar() {
  const params = useSearchParams();
  const pathname = usePathname();
  const flow = flowOf(params.get("job"));
  useResume(flow !== undefined, pathname, params.toString());
  useFromParam(flow, params.get("from"), params.get("step"));
  // «Ξεκινώ τη μέρα μου»: τα βήματα 1 και 3 είναι η ίδια η Σήμερα· μπάρα μόνο στο βήμα 2, στον σταθμό της γραμμής.
  if (flow?.id === XEKINO_JOB) {
    const item = params.get("item");
    return params.get("step") === "2" && item ? (
      <XekinoBar item={item} href={`${pathname}?${params.toString()}`} />
    ) : null;
  }
  return flow ? (
    <PlacedGuide
      flow={flow}
      step={parseStep(params.get("step"), flow)}
      pathname={pathname}
    />
  ) : null;
}
