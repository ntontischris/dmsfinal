"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { labelOf } from "@/spaces/data/spaces";
import { Panel } from "@/spaces/kit/panel";
import { Meter } from "@/spaces/kit/parts";

import {
  flowOf,
  isLast,
  isWait,
  parseStep,
  stepHref,
  type Flow,
} from "./flows";
import {
  forgetActive,
  park,
  readActive,
  rememberActive,
  unpark,
} from "./parked";

import "./flows.css";

// Μετά την αποθήκευση ενός σταθμού (π.χ. Νέο Γύρισμα → σελίδα Γυρίσματος) το URL χάνει τη θέση: ο οδηγός τη βάζει πίσω.
function useResumeAfterSave(hasPlace: boolean, pathname: string) {
  const router = useRouter();
  useEffect(() => {
    if (hasPlace) return;
    const active = readActive();
    const flow = flowOf(active?.job);
    if (!active || !flow) return;
    if (flow.steps[active.step - 1]?.landsOn?.test(pathname))
      router.replace(stepHref(flow, active.step + 1, pathname));
  }, [hasPlace, pathname, router]);
}

interface GuideProps {
  flow: Flow;
  step: number;
  pathname: string;
}

function GuideActions({ flow, step, pathname }: GuideProps) {
  const router = useRouter();
  const goHome = () => {
    forgetActive();
    router.push("/app");
  };
  const handleExit = () => {
    park({ job: flow.id, step, reason: "exit", at: Date.now() });
    goHome();
  };
  const handleNext = () => {
    if (isLast(flow, step)) {
      unpark(flow.id);
      return goHome();
    }
    const next = flow.steps[step];
    if (next && isWait(next)) {
      park({ job: flow.id, step: step + 2, reason: "wait", at: Date.now() });
      return goHome();
    }
    router.push(stepHref(flow, step + 1, pathname));
  };
  const station = stepHref(flow, step, pathname);
  const isAtStation = station.split("?")[0] === pathname;
  const current = flow.steps[step - 1];
  return (
    <div className="btn-row flow-guide-actions">
      <button
        type="button"
        className="button"
        data-primary="true"
        onClick={handleNext}
      >
        {isLast(flow, step) ? "Τέλος" : "Επόμενο"}
      </button>
      {!isAtStation && current && (
        <Link className="button" href={station}>
          Άνοιξε: {labelOf(current.station)}
        </Link>
      )}
      {step > 1 && (
        <Link className="button" href={stepHref(flow, step - 1, pathname)}>
          Πίσω
        </Link>
      )}
      <button type="button" className="button" onClick={handleExit}>
        Έξοδος
      </button>
    </div>
  );
}

function Guide({ flow, step, pathname }: GuideProps) {
  const current = flow.steps[step - 1];
  return (
    <div data-spaces className="flow-guide">
      <Panel
        label={`Οδηγός · ${flow.name}`}
        aside={`Βήμα ${step} από ${flow.steps.length}`}
      >
        <Meter label={current.area} used={step} total={flow.steps.length} />
        <p className="flow-guide-question">{current.question}</p>
        {isLast(flow, step) ? (
          <p className="flow-guide-done" role="status">
            {flow.done}
          </p>
        ) : (
          <p className="flow-guide-preset">{current.preset}</p>
        )}
        {current.hidden && (
          <details className="flow-guide-more">
            <summary>Περισσότερα</summary>
            <p>{current.hidden}</p>
          </details>
        )}
        <GuideActions flow={flow} step={step} pathname={pathname} />
      </Panel>
    </div>
  );
}

// Ο οδηγός πάνω από κάθε οθόνη όσο το URL έχει ?job=&step=. Χωρίς θέση δεν δείχνει τίποτα.
export function GuideBar() {
  const params = useSearchParams();
  const pathname = usePathname();
  const flow = flowOf(params.get("job"));
  const step = flow ? parseStep(params.get("step"), flow) : 0;
  useResumeAfterSave(flow !== undefined, pathname);
  useEffect(() => {
    if (flow) rememberActive(flow.id, step);
  }, [flow, step]);
  return flow ? <Guide flow={flow} step={step} pathname={pathname} /> : null;
}
