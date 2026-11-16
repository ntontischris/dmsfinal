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
import { doneOf, roundCounterOf, XEKINO_LIST } from "./xekino-rows";
import { parseRound, readRoundRaw, subscribeRound } from "./xekino-round";

import "./flows.css";

const POLL_MS = 15_000;

// Οι αναγνώσεις της λίστας: η πρώτη στο άνοιγμα, μετά σε κάθε επιστροφή στην καρτέλα και ανά 15″.
function useQueueReads(): readonly (readonly string[])[] {
  const [reads, setReads] = useState<readonly (readonly string[])[]>([]);
  useEffect(() => {
    let isLive = true;
    const read = async () => {
      const keys = await readQueueKeys().catch(() => null);
      if (isLive && keys)
        setReads((old) => (old.length === 0 ? [keys] : [old[0], keys]));
    };
    void read();
    const id = window.setInterval(() => void read(), POLL_MS);
    window.addEventListener("focus", read);
    return () => {
      isLive = false;
      window.clearInterval(id);
      window.removeEventListener("focus", read);
    };
  }, []);
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
  const done = doneOf(item, useQueueReads());
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
