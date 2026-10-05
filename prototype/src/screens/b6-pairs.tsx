"use client";

import { useState } from "react";

import { Badge } from "@/screens/shared";

export interface PairSide {
  id: string;
  name: string;
  fields: readonly [string, string][];
}

export interface DuplicatePair {
  key: string;
  reason: string;
  candidate: PairSide;
  existing: PairSide;
}

interface PairsProps {
  pairs: readonly DuplicatePair[];
}

type Resolution = { kind: "merged"; survivor: string } | { kind: "other" };

function Side({ side, title }: { side: PairSide; title: string }) {
  return (
    <div className="card">
      <h2>
        {side.name} <Badge>{title}</Badge>
      </h2>
      <dl className="dl">
        {side.fields.map(([label, value]) => (
          <div key={label} style={{ display: "contents" }}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function DuplicatePairs({ pairs }: PairsProps) {
  const [resolved, setResolved] = useState<
    Readonly<Record<string, Resolution>>
  >({});
  const [survivor, setSurvivor] = useState<Readonly<Record<string, string>>>(
    {},
  );

  if (pairs.every((pair) => pair.key in resolved) && pairs.length > 0) {
    return (
      <>
        {pairs.map((pair) => (
          <ResolvedNote
            key={pair.key}
            pair={pair}
            resolution={resolved[pair.key]}
          />
        ))}
        <section className="card notice" role="status">
          <h2>Δεν έμειναν Πιθανά διπλά</h2>
        </section>
      </>
    );
  }

  return (
    <>
      {pairs.map((pair) => {
        const chosen = survivor[pair.key] ?? pair.existing.id;
        if (pair.key in resolved)
          return (
            <ResolvedNote
              key={pair.key}
              pair={pair}
              resolution={resolved[pair.key]}
            />
          );
        return (
          <section key={pair.key}>
            <p className="note">{pair.reason}</p>
            <div className="compare">
              <Side
                side={pair.candidate}
                title="Νέος, με σήμα «Πιθανό διπλό»"
              />
              <Side side={pair.existing} title="Υπάρχων" />
            </div>
            <div className="toolbar">
              <label>
                Ο Πελάτης που μένει:{" "}
                <select
                  className="select"
                  value={chosen}
                  onChange={(event) =>
                    setSurvivor({ ...survivor, [pair.key]: event.target.value })
                  }
                >
                  <option value={pair.existing.id}>{pair.existing.name}</option>
                  <option value={pair.candidate.id}>
                    {pair.candidate.name}
                  </option>
                </select>
              </label>
              <button
                type="button"
                className="button"
                data-primary="true"
                onClick={() =>
                  setResolved({
                    ...resolved,
                    [pair.key]: { kind: "merged", survivor: chosen },
                  })
                }
              >
                Συγχώνευση
              </button>
              <button
                type="button"
                className="button"
                onClick={() =>
                  setResolved({ ...resolved, [pair.key]: { kind: "other" } })
                }
              >
                Είναι άλλος
              </button>
            </div>
            <p className="muted">
              Η Συγχώνευση ενώνει τους δύο Πελάτες σε έναν, με όλες τις
              Ευκαιρίες, Συμφωνίες και το ιστορικό τους. Το «είναι άλλος»
              κλείνει το σήμα χωρίς ένωση.
            </p>
          </section>
        );
      })}
    </>
  );
}

function ResolvedNote({
  pair,
  resolution,
}: {
  pair: DuplicatePair;
  resolution: Resolution;
}) {
  const survivorName =
    resolution.kind === "merged" && resolution.survivor === pair.candidate.id
      ? pair.candidate.name
      : pair.existing.name;
  return (
    <p className="note" role="status">
      {resolution.kind === "merged"
        ? `Συγχωνεύθηκαν: ο ενιαίος Πελάτης είναι «${survivorName}», με όλες τις Ευκαιρίες και το ιστορικό και των δύο.`
        : `«${pair.candidate.name}»: σημειώθηκε «είναι άλλος». Το σήμα έκλεισε, οι Πελάτες μένουν χωριστοί.`}
    </p>
  );
}
