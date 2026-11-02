"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Badge, StateNotice } from "@/spaces/screens/shared";

import type { DeliverableVersion } from "../types";
import { CommentForm, CommentList } from "./h2-comments";
import {
  VERSION_WORDS,
  fmtDay,
  latestOf,
  versionsInOrder,
  type PanelProps,
} from "./h2-model";
import { countLabel } from "./h1-model";

// Οι Εκδόσεις του H2 (prototype `screens/h2-versions.tsx`): καρτέλα ανά Έκδοση, τα στοιχεία της και τα σχόλιά της.

function VersionFacts({ version }: { version: DeliverableVersion }) {
  return (
    <dl className="dl">
      <dt>Link</dt>
      <dd>
        <a href={version.url} target="_blank" rel="noreferrer noopener">
          {version.url}
        </a>{" "}
        <Badge>{version.host}</Badge>
        {version.linkBroken && (
          <>
            {" "}
            <Badge tone="attention">δεν ανοίγει το link</Badge>
          </>
        )}
      </dd>
      <dt>Προστέθηκε</dt>
      <dd>{fmtDay(version.createdAt)}</dd>
      {version.note && (
        <>
          <dt>Τι άλλαξε</dt>
          <dd>{version.note}</dd>
        </>
      )}
      {version.reviewNote && (
        <>
          <dt>Έλεγχος</dt>
          <dd>Σημείωση επιστροφής: {version.reviewNote}</dd>
        </>
      )}
      {version.sentAt && (
        <>
          <dt>Στάλθηκε στον πελάτη</dt>
          <dd>{fmtDay(version.sentAt)}</dd>
        </>
      )}
      {version.answeredAt && (
        <>
          <dt>Απάντηση πελάτη</dt>
          <dd>
            {fmtDay(version.answeredAt)}
            {version.answerNote ? `: ${version.answerNote}` : ""}
          </dd>
        </>
      )}
    </dl>
  );
}

function VersionHints({
  version,
  daysWaiting,
}: {
  version: DeliverableVersion;
  daysWaiting: number | null;
}) {
  if (version.state === "in_review")
    return (
      <p className="note">
        Αναμένει εσωτερικό έλεγχο· ο πελάτης δεν τη βλέπει ακόμα.
      </p>
    );
  if (version.state === "returned")
    return (
      <p className="note">
        Επιστράφηκε από τον έλεγχο· δεν μετρά γύρο και δεν άλλαξε η προθεσμία.
      </p>
    );
  if (version.state !== "awaiting_client" || daysWaiting === null) return null;
  return (
    <p className="note">
      Αναμένει πελάτη{" "}
      {daysWaiting === 0
        ? "από σήμερα"
        : `εδώ και ${countLabel(daysWaiting, "μέρα", "μέρες")}`}
      . Αν ο πελάτης ενέκρινε τηλεφωνικά, ζήτησέ του να πατήσει το κουμπί στο
      email, ή παράδωσε την Παραγωγή χειροκίνητα με σχόλιο.
    </p>
  );
}

export function H2Versions({ detail, ctx }: PanelProps) {
  const versions = versionsInOrder(detail.versions);
  const latest = latestOf(detail)?.number;
  const [picked, setPicked] = useState(ctx.initialVersion ?? latest);
  const [seenLatest, setSeenLatest] = useState(latest);
  // Μόλις προστεθεί νέα Έκδοση, η προβολή πηγαίνει σε αυτή.
  if (latest !== seenLatest) {
    setSeenLatest(latest);
    setPicked(latest);
  }
  const version = versions.find((v) => v.number === picked) ?? versions.at(-1);
  return (
    <Panel
      label="Εκδόσεις"
      aside={<span className="muted">{versions.length} συνολικά</span>}
    >
      {!version ? (
        <StateNotice kind="empty" title="Δεν υπάρχουν ακόμα Εκδόσεις">
          <p>Πρόσθεσε την πρώτη με «Νέα Έκδοση».</p>
        </StateNotice>
      ) : (
        <>
          <div className="tabs" role="tablist">
            {versions.map((v) => (
              <button
                key={v.number}
                type="button"
                className="tab h2-tab"
                aria-current={v.number === version.number ? "page" : undefined}
                onClick={() => setPicked(v.number)}
              >
                v{v.number} · {VERSION_WORDS[v.state]}
              </button>
            ))}
          </div>
          <div className="h2-signals">
            <Badge tone="strong">{VERSION_WORDS[version.state]}</Badge>
          </div>
          <VersionFacts version={version} />
          <VersionHints
            version={version}
            daysWaiting={version.number === latest ? detail.daysWaiting : null}
          />
          <h3>Σχόλια</h3>
          <CommentList comments={version.comments} />
          {detail.can.comment && (
            <CommentForm
              deliverableId={detail.id}
              versionNumber={version.number}
            />
          )}
        </>
      )}
    </Panel>
  );
}
