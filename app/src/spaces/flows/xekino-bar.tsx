"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Meter } from "@/spaces/kit/parts";

import { XEKINO, XEKINO_JOB } from "./flow-xekino";
import { LaterMenu } from "./later-menu";
import { park, unpark } from "./parked";
import { readQueueKeys } from "./place-actions";
import { postponeRows } from "./today-actions";
import {
  doneOf,
  roundCounterOf,
  XEKINO_LIST,
  type QueueRead,
} from "./xekino-rows";
import { parseRound, readRoundRaw, subscribeRound } from "./xekino-round";

import "./flows.css";

// Ελαφρύ: μία ανάγνωση στο άνοιγμα, μετά από κάθε αποστολή φόρμας του σταθμού, στην επιστροφή στην καρτέλα,
// και αραιά ανά λεπτό για ό,τι έκλεισε άλλος.
const POLL_MS = 60_000;
const AFTER_SUBMIT_MS = 2_000;
const BASELINE_KEY = "flows:xekino-baseline:";

// Η πρώτη ανάγνωση της γραμμής μένει στην καρτέλα: ένα remount (redirect του σταθμού) δεν τη χάνει,
// οπότε η γραμμή δεν δείχνει κατά λάθος «Έγινε ήδη».
const baselineOf = (item: string, fresh: QueueRead): QueueRead => {
  try {
    const saved = window.sessionStorage.getItem(BASELINE_KEY + item);
    if (saved) return JSON.parse(saved) as QueueRead;
    window.sessionStorage.setItem(BASELINE_KEY + item, JSON.stringify(fresh));
  } catch {
    // Χωρίς sessionStorage η πρώτη ανάγνωση μένει μόνο στη μνήμη.
  }
  return fresh;
};

function useQueueReads(item: string): readonly QueueRead[] {
  const [reads, setReads] = useState<readonly QueueRead[]>([]);
  useEffect(() => {
    let isLive = true;
    const read = async () => {
      const keys = await readQueueKeys().catch(() => null);
      if (isLive && keys)
        setReads((old) =>
          old.length === 0 ? [baselineOf(item, keys), keys] : [old[0], keys],
        );
    };
    const readSoon = () => window.setTimeout(() => void read(), AFTER_SUBMIT_MS);
    void read();
    const id = window.setInterval(() => void read(), POLL_MS);
    window.addEventListener("focus", read);
    document.addEventListener("submit", readSoon, true);
    return () => {
      isLive = false;
      window.clearInterval(id);
      window.removeEventListener("focus", read);
      document.removeEventListener("submit", readSoon, true);
    };
  }, [item]);
  return reads;
}

// Η θέση του «Ξεκινώ» στον λογαριασμό: αν φύγω από τον σταθμό, η γραμμή είναι πρώτη με «Συνέχισε».
function useXekinoPlace(item: string, href: string) {
  useEffect(() => {
    void park({
      job: XEKINO_JOB,
      step: 2,
      reason: "exit",
      at: Date.now(),
      item,
      href: href.slice(0, 500),
    });
  }, [item, href]);
}

interface XekinoBarProps {
  item: string;
  href: string;
}

// Βήμα 2 «Έγινε;» πάνω από τον σταθμό της γραμμής: «Γραμμή n από N», «Επόμενο ✓» όταν η κίνηση έγινε στη βάση.
export function XekinoBar({ item, href }: XekinoBarProps) {
  const router = useRouter();
  const [now] = useState(Date.now);
  const [error, setError] = useState<string | null>(null);
  const round = parseRound(
    useSyncExternalStore(subscribeRound, readRoundRaw, () => "null"),
  );
  const done = doneOf(item, useQueueReads(item));
  useXekinoPlace(item, href);
  const backToList = async (query = "") => {
    await unpark(XEKINO_JOB);
    router.push(`${XEKINO_LIST}${query}`);
  };
  const postpone = async (keys: readonly string[], until: number) => {
    const result = await postponeRows({ rowKeys: keys, until, stale: [] });
    if (result.error) setError(result.error);
    else await backToList();
  };
  const isDone = done.isDone || done.wasDoneBefore;
  const step = XEKINO.steps[1];
  return (
    <div data-spaces className="flow-guide">
      <Panel
        label={`Οδηγός · ${XEKINO.name}`}
        aside={roundCounterOf(round, item) ?? undefined}
      >
        <Meter label={step.area} used={2} total={XEKINO.steps.length} />
        <p className="flow-guide-question">{step.question}</p>
        <p className="flow-guide-preset">{step.preset}</p>
        {done.wasDoneBefore && (
          <p className="flow-guide-done" role="status">
            Έγινε ήδη
          </p>
        )}
        {error && (
          <p className="flow-guide-missing" role="alert">
            {error}
          </p>
        )}
        <div className="btn-row flow-guide-actions">
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={() =>
              void backToList(`&after=${encodeURIComponent(item)}`)
            }
          >
            {isDone ? "Επόμενο ✓" : "Επόμενο"}
          </button>
          <LaterMenu
            keys={[item]}
            label="Αργότερα ▾"
            now={now}
            postpone={(keys, until) => void postpone(keys, until)}
          />
          <button
            type="button"
            className="button"
            data-ghost="true"
            onClick={() => void backToList()}
          >
            Πίσω στη λίστα
          </button>
        </div>
      </Panel>
    </div>
  );
}
