"use client";

import { useState } from "react";

import type { Version } from "@/data/deliverables";
import { CommentForm, CommentList } from "@/screens/h2-comments";
import {
  daysSince,
  whoLabel,
  type PanelProps,
} from "@/screens/h2-model";
import { addComment } from "@/screens/h2-reducers";
import { Badge, StateNotice, fmtDate } from "@/screens/shared";

function VersionFacts({ version }: { version: Version }) {
  const { review, answer } = version;
  return (
    <dl className="dl">
      <dt>Link</dt>
      <dd>
        <a href={version.link} target="_blank" rel="noreferrer noopener">
          {version.link}
        </a>{" "}
        <Badge>{version.host}</Badge>
      </dd>
      <dt>Προστέθηκε</dt>
      <dd>
        {whoLabel(version.addedBy)} στις {fmtDate(version.addedAt)}
      </dd>
      {review && (
        <>
          <dt>Έλεγχος</dt>
          <dd>
            Έλεγξε ο/η {whoLabel(review.by)} στις {fmtDate(review.when)}
            {review.note && (
              <>
                <br />
                Σημείωση επιστροφής: {review.note}
              </>
            )}
          </dd>
        </>
      )}
      {version.sentAt && (
        <>
          <dt>Στάλθηκε στον πελάτη</dt>
          <dd>{fmtDate(version.sentAt)}</dd>
        </>
      )}
      {answer && (
        <>
          <dt>Απάντηση πελάτη</dt>
          <dd>
            {answer.by} στις {fmtDate(answer.when)}
          </dd>
        </>
      )}
      {version.linkFixedAt && (
        <>
          <dt>Link</dt>
          <dd>link διορθώθηκε στις {fmtDate(version.linkFixedAt)}</dd>
        </>
      )}
    </dl>
  );
}

function VersionHints({ version }: { version: Version }) {
  if (version.state === "αναμένει εσωτερικό έλεγχο")
    return (
      <p className="note">
        Αναμένει εσωτερικό έλεγχο· ο πελάτης δεν τη βλέπει ακόμα.
      </p>
    );
  if (version.state === "επιστράφηκε από έλεγχο")
    return (
      <p className="note">
        Επιστράφηκε από τον έλεγχο· δεν μετρά γύρο και δεν άλλαξε η προθεσμία.
      </p>
    );
  if (version.state !== "αναμένει πελάτη" || !version.sentAt) return null;
  return (
    <p className="note">
      Αναμένει πελάτη εδώ και {daysSince(version.sentAt)} μέρες. Αν ο πελάτης
      ενέκρινε τηλεφωνικά, ζήτησέ του να πατήσει το κουμπί στο email, ή παράδωσε
      την Παραγωγή χειροκίνητα με σχόλιο.
    </p>
  );
}

export function H2Versions({
  ctx,
  live,
  update,
  initial,
}: PanelProps & { initial?: number }) {
  const latest = live.versions.at(-1)?.number;
  const [picked, setPicked] = useState(initial ?? latest);
  const version =
    live.versions.find((v) => v.number === picked) ?? live.versions.at(-1);
  return (
    <section className="card">
      <div className="card-title">
        <h2>Εκδόσεις</h2>
        <span className="muted">{live.versions.length} συνολικά</span>
      </div>
      {!version ? (
        <StateNotice kind="empty" title="Δεν υπάρχουν ακόμα Εκδόσεις">
          <p>Πρόσθεσε την πρώτη με «Νέα Έκδοση».</p>
        </StateNotice>
      ) : (
        <>
          <div className="tabs" role="tablist">
            {live.versions.map((v) => (
              <button
                key={v.number}
                type="button"
                className="tab h2-tab"
                aria-current={v.number === version.number ? "page" : undefined}
                onClick={() => setPicked(v.number)}
              >
                v{v.number} · {v.state}
              </button>
            ))}
          </div>
          <div className="h2-signals">
            <Badge tone="strong">{version.state}</Badge>
          </div>
          <VersionFacts version={version} />
          <VersionHints version={version} />
          <h3>Σχόλια</h3>
          <CommentList comments={version.comments} />
          <CommentForm
            onAdd={(c) => update((l) => addComment(l, ctx, version.number, c))}
          />
        </>
      )}
    </section>
  );
}
