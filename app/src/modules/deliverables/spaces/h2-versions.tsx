"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { VideoPlayer, useVideoControl } from "@/spaces/kit/video-player";
import { Badge, StateNotice } from "@/spaces/screens/shared";

import {
  markCommentsSeen,
  replyToComment,
  resolveComment,
} from "../actions-comments";
import type { DeliverableDetail, DeliverableVersion } from "../types";
import { CommentForm } from "./h2-comments";
import {
  CLIENT_NAME,
  VERSION_WORDS,
  fmtDay,
  latestOf,
  versionsInOrder,
  type PanelProps,
} from "./h2-model";
import { countLabel } from "./h1-model";
import { clientPreviewOf } from "./notes-model";
import { VideoNotes } from "./video-notes";
import { useMarkSeen } from "./video-notes-fields";

// Οι Εκδόσεις του H2 (prototype `screens/h2-versions.tsx`): καρτέλα ανά Έκδοση, το βίντεο, τα στοιχεία της
// και οι σημειώσεις της. «Όπως ο πελάτης»: μόνο ό,τι έχει σταλεί, χωρίς τα εσωτερικά, χωρίς κουμπιά.

type View = "team" | "client";

const TEAM_ACTIONS = { reply: replyToComment, resolve: resolveComment };

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

function VersionBody({
  detail,
  version,
  isLatest,
  view,
}: {
  detail: DeliverableDetail;
  version: DeliverableVersion;
  isLatest: boolean;
  view: View;
}) {
  const control = useVideoControl();
  const isTeam = view === "team";
  useMarkSeen(
    markCommentsSeen,
    detail.id,
    version.number,
    version.comments.length > 0,
  );
  return (
    <>
      <VideoPlayer
        link={version.url}
        title={`${detail.title} · v${version.number}`}
        control={control}
      />
      {isTeam ? (
        <>
          <VersionFacts version={version} />
          <VersionHints
            version={version}
            daysWaiting={isLatest ? detail.daysWaiting : null}
          />
        </>
      ) : (
        <p className="note">
          Έτσι το βλέπει ο πελάτης: μόνο οι Εκδόσεις που του στάλθηκαν, χωρίς τα
          εσωτερικά σχόλια.
        </p>
      )}
      <h3>Σχόλια</h3>
      <VideoNotes
        notes={version.comments}
        control={control}
        actions={isTeam && detail.can.comment ? TEAM_ACTIONS : null}
        unnamed={CLIENT_NAME}
      />
      {isTeam && detail.can.comment && (
        <CommentForm
          deliverableId={detail.id}
          versionNumber={version.number}
          control={control}
        />
      )}
    </>
  );
}

function ViewChoice({
  view,
  onChange,
}: {
  view: View;
  onChange: (view: View) => void;
}) {
  return (
    <div className="choice-row" role="group" aria-label="Ποια ματιά">
      <button
        type="button"
        className="button"
        aria-pressed={view === "team"}
        onClick={() => onChange("team")}
      >
        Όπως η ομάδα
      </button>
      <button
        type="button"
        className="button"
        aria-pressed={view === "client"}
        onClick={() => onChange("client")}
      >
        Δες το όπως ο πελάτης
      </button>
    </div>
  );
}

export function H2Versions({ detail, ctx }: PanelProps) {
  const [view, setView] = useState<View>("team");
  const versions = versionsInOrder(
    view === "client" ? clientPreviewOf(detail.versions) : detail.versions,
  );
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
      {detail.versions.length > 0 && (
        <ViewChoice view={view} onChange={setView} />
      )}
      {!version ? (
        <StateNotice
          kind="empty"
          title={
            view === "client"
              ? "Ο πελάτης δεν βλέπει ακόμα καμία Έκδοση"
              : "Δεν υπάρχουν ακόμα Εκδόσεις"
          }
        >
          <p>
            {view === "client"
              ? "Βλέπει μια Έκδοση μόλις του σταλεί."
              : "Πρόσθεσε την πρώτη με «Νέα Έκδοση»."}
          </p>
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
          <VersionBody
            key={`${view}-${version.number}`}
            detail={detail}
            version={version}
            isLatest={version.number === latest}
            view={view}
          />
        </>
      )}
    </Panel>
  );
}
