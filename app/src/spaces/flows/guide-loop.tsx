"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { oldestHref, stepHref, type Flow } from "./flows";
import { fromLabelOf, parseFrom, readFromRaw, returnFrom } from "./from-guide";
import { loadLoopRows, type LoopData } from "./loop-rows";
import {
  counterOf,
  loopStateOf,
  parseRun,
  readRun,
  readRunRaw,
  subscribeRun,
  tallyText,
  updateRun,
  withCount,
  withHandled,
  withOutcome,
  withoutSkipped,
  withSkipped,
  type LoopRun,
  type LoopState,
} from "./loop-run";
import { dateOf } from "./guide-primary";
import { park, readActive } from "./parked";

// Ό,τι ξέρει ο οδηγός που γυρνά για τον γύρο του.
export interface Loop {
  // Οι γραμμές που περιμένουν (μόνο στο βήμα 1)· undefined = διαβάζονται, null = δεν διαβάστηκαν.
  state: LoopState | null | undefined;
  // «Γραμμή k από N», ή null όταν δεν ξέρουμε.
  counter: string | null;
  // Η φράση ολοκλήρωσης με τους αριθμούς του γύρου.
  doneText: string;
  // «Το αφήνω για μετά»: η γραμμή μένει και πάμε στην επόμενη.
  skip: () => void;
  // Η γραμμή τελείωσε χωρίς μήνυμα από τον σταθμό (κουμπί του οδηγού προς το βήμα 1).
  handled: () => void;
  // «Πίσω σε όσες άφησα για μετά».
  unskip: () => void;
}

const doneTextOf = (flow: Flow, run: LoopRun | null): string =>
  flow.doneTally && run && Object.keys(run.tally).length > 0
    ? tallyText(flow.doneTally, run.tally)
    : flow.done;

// Η κατάσταση του γύρου στη μνήμη της καρτέλας, ώστε η οθόνη να ανανεώνεται όταν αλλάζει.
function useRun(job: string) {
  // undefined = ακόμη στον server (πριν διαβαστεί η καρτέλα).
  const raw = useSyncExternalStore(
    subscribeRun,
    () => readRunRaw(job),
    () => undefined,
  );
  const run = useMemo(
    () => (raw === undefined ? null : parseRun(raw, job)),
    [raw, job],
  );
  const change = useCallback(
    (fn: (run: LoopRun) => LoopRun) => {
      updateRun(job, fn);
    },
    [job],
  );
  return { run, change };
}

// Διαβάζει τις γραμμές και πηγαίνει στην επόμενη που δεν άφησα για μετά (ή στο βήμα 1, όπου φαίνεται το τέλος).
function useAdvance(flow: Flow, change: (fn: (run: LoopRun) => LoopRun) => void) {
  const router = useRouter();
  return useCallback(
    async (leaving: string) => {
      const data = await loadLoopRows(flow.id);
      if (data) change((run) => withCount(run, data.count));
      const rows = (data?.rows ?? []).filter((row) => row.key !== leaving);
      const next = loopStateOf(rows, readRun(flow.id).skipped).next;
      const href = next ? oldestHref(flow, 1, next.href, next.kind) : null;
      router.push(href ?? stepHref(flow, 1));
    },
    [flow, change, router],
  );
}

// Στο βήμα 1 οι γραμμές διαβάζονται· ο αριθμός τους κρατιέται για το «Γραμμή k από N».
function useLoopData(flow: Flow, isOn: boolean, change: (fn: (run: LoopRun) => LoopRun) => void) {
  const [loaded, setLoaded] = useState<{ job: string; data: LoopData | null } | null>(null);
  useEffect(() => {
    if (!isOn) return;
    let isLive = true;
    void loadLoopRows(flow.id).then((data) => {
      if (!isLive) return;
      setLoaded({ job: flow.id, data });
      if (data) change((run) => withCount(run, data.count));
    });
    return () => {
      isLive = false;
    };
  }, [flow.id, isOn, change]);
  return isOn && loaded?.job === flow.id ? loaded.data : undefined;
}

// Ο σταθμός λέει τι έγινε (απάντηση, δουλειά, απόρριψη…) και ο οδηγός πάει μόνος του εκεί που λέει το βήμα.
function useOutcome(
  flow: Flow,
  at: { step: number; pathname: string },
  change: (fn: (run: LoopRun) => LoopRun) => void,
  advance: (leaving: string) => Promise<void>,
) {
  const router = useRouter();
  const { step, pathname } = at;
  const advancesOn = flow.steps[step - 1]?.advancesOn;
  useEffect(() => {
    if (!advancesOn) return;
    const handleOutcome = (event: Event) => {
      const outcome = event instanceof CustomEvent ? String(event.detail) : "";
      const target = advancesOn[outcome];
      if (target === undefined) return;
      change((run) => withOutcome(run, outcome, target === 1));
      if (target === 1) void advance(pathname);
      else router.push(stepHref(flow, target, { pathname }));
    };
    window.addEventListener("flows:outcome", handleOutcome);
    return () => window.removeEventListener("flows:outcome", handleOutcome);
  }, [flow, advancesOn, pathname, change, advance, router]);
}

export function useLoop(flow: Flow, step: number, pathname: string): Loop {
  const { run, change } = useRun(flow.id);
  const advance = useAdvance(flow, change);
  const data = useLoopData(flow, flow.isLoop === true && step === 1, change);
  useOutcome(flow, { step, pathname }, change, advance);
  // Ο κανόνας ουράς μπορεί να μετρά περισσότερες από τις γραμμές που δίνει: μετρά ο αριθμός του.
  const state = data
    ? { ...loopStateOf(data.rows, run?.skipped ?? []), count: data.count }
    : data;
  const skippedLeft = state ? state.skippedLeft : (run?.skipped.length ?? 0);
  const counter = run ? counterOf(run, skippedLeft) : null;
  return {
    state,
    counter: counter ? `Γραμμή ${counter.k} από ${counter.n}` : null,
    doneText: doneTextOf(flow, run),
    skip: () => {
      change((current) => withSkipped(current, pathname));
      void advance(pathname);
    },
    handled: () => change(withHandled),
    unskip: () => change(withoutSkipped),
  };
}

// Τελείωσαν όλες εκτός από όσες άφησα για μετά.
export function LoopLeftover({ loop }: { loop: Loop }) {
  const left = loop.state?.skippedLeft ?? 0;
  return (
    <p className="flow-guide-done" role="status">
      Μένουν {left} που άφησες για μετά.{" "}
      <button type="button" className="button" data-primary="true" onClick={loop.unskip}>
        Πίσω σε αυτές
      </button>
    </p>
  );
}

const subscribeNever = (): (() => void) => () => {};

// Ο οδηγός που μας έστειλε (π.χ. «Απαντώ σε Πελάτες» → «Στήνω γύρισμα»): ένα κουμπί για να γυρίσουμε εκεί.
export function BackToFrom({ flow, step }: { flow: Flow; step: number }) {
  const router = useRouter();
  // Διαβάζεται σε κάθε απόδοση (και σε αλλαγή βήματος)· στον server δεν υπάρχει.
  const raw = useSyncExternalStore(
    subscribeNever,
    () => readFromRaw(flow.id),
    () => null,
  );
  const place = useMemo(() => parseFrom(raw), [raw]);
  if (!place) return null;
  const handleBack = () => {
    park({
      job: flow.id,
      step,
      reason: "exit",
      at: Date.now(),
      date: dateOf(),
      filming: readActive()?.filming,
    });
    router.push(returnFrom(flow.id, step) ?? place.href);
  };
  return (
    <button type="button" className="button" onClick={handleBack}>
      {fromLabelOf(place.href)}
    </button>
  );
}
