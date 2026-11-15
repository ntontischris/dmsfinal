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
import { useJobDigest } from "./use-job-digest";

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
        Πίσω στο βήμα {markOf(flow, back)}
      </Link>
    </p>
  );
}

function Guide(props: GuideProps) {
  const { flow, step, isFinished } = props;
  const current = flow.steps[step - 1];
  return (
    <div data-spaces className="flow-guide">
      <Panel
        label={`Οδηγός · ${flow.name}`}
        aside={`Βήμα ${markOf(flow, step)} από ${totalOf(flow)}`}
      >
        <Meter
          label={current.area}
          used={depthOf(flow, step)}
          total={totalOf(flow)}
        />
        <p className="flow-guide-question">{current.question}</p>
        <p className="flow-guide-preset">{current.preset}</p>
        {current.picksClient && <GuideClients flow={flow} step={step} />}
        {isFinished && <DoneLine flow={flow} />}
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

interface PlacedProps {
  flow: Flow;
  step: number;
  pathname: string;
}

// Ο οδηγός που γυρνά: στο βήμα 1 διαβάζει τον κανόνα ουράς του· χωρίς γραμμή που περιμένει, τελείωσε.
function PlacedGuide({ flow, step, pathname }: PlacedProps) {
  const counts = useFilmingCounts();
  const digest = useJobDigest(flow.id, flow.isLoop === true && step === 1);
  const isFinished = isLast(flow, step) || digest?.count === 0;
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
      oldest={digest?.oldest?.href}
    />
  );
}

// Ο οδηγός πάνω από κάθε οθόνη όσο το URL έχει ?job=&step=. Χωρίς θέση ξαναμπαίνει μόνο από τη θέση της καρτέλας.
export function GuideBar() {
  const params = useSearchParams();
  const pathname = usePathname();
  const flow = flowOf(params.get("job"));
  useResume(flow !== undefined, pathname, params.toString());
  return flow ? (
    <PlacedGuide
      flow={flow}
      step={parseStep(params.get("step"), flow)}
      pathname={pathname}
    />
  ) : null;
}
