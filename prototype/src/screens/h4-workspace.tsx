"use client";

import Link from "next/link";
import { useState } from "react";

import type { RoleId } from "@/data/roles";
import { H4After } from "@/screens/h4-after";
import { H4CommentForm, H4CommentList } from "@/screens/h4-comments";
import { H4Decision } from "@/screens/h4-decision";
import { H4Player } from "@/screens/h4-player";
import {
  initialStateOf,
  withApproval,
  withChangeRequest,
  withComment,
  withPostApprovalRequest,
  type LocalState,
} from "@/screens/h4-state";
import type { ClientVersionView, H4View } from "@/screens/h3-model";
import { Badge, fmtDate, screenHref } from "@/screens/shared";

interface WorkspaceProps {
  role: RoleId;
  view: H4View;
  selected: number;
  stateParam?: string;
}

function VersionTabs({ role, view, selected, stateParam }: WorkspaceProps) {
  return (
    <nav className="tabs" aria-label="Εκδόσεις">
      {view.versions.map((v) => (
        <Link
          key={v.number}
          className="tab"
          aria-current={v.number === selected ? "page" : undefined}
          href={screenHref(role, "H4", {
            id: view.id,
            v: String(v.number),
            state: stateParam,
          })}
        >
          v{v.number} · {v.stateLabel}
        </Link>
      ))}
    </nav>
  );
}

function AnswerLine({
  version,
  local,
}: {
  version: ClientVersionView;
  local: LocalState;
}) {
  const answer = local.answers[version.number] ?? version.answer;
  if (!answer) return null;
  return (
    <p className="h34-memo">
      {answer.isApproval ? "Ενέκρινε" : "Ζήτησε αλλαγές"} η/ο {answer.by} στις{" "}
      {fmtDate(answer.when)}.
    </p>
  );
}

export function H4Workspace(props: WorkspaceProps) {
  const { role, view, selected } = props;
  const [local, setLocal] = useState<LocalState>(() => initialStateOf(view));
  const [reported, setReported] = useState<readonly number[]>([]);
  const version = view.versions.find((v) => v.number === selected);
  const latest = view.versions.at(-1)?.number;
  const comments = !version
    ? []
    : [
        ...version.comments,
        ...local.comments.filter((c) => c.version === version.number),
      ];
  const isCancelled = local.status === "ακυρώθηκε";
  const canAct =
    !!version &&
    version.number === latest &&
    local.status === "περιμένει εσένα" &&
    !local.answers[version.number];

  const handleReportBroken = () => {
    if (!version) return;
    setReported((list) => [...list, version.number]);
    setLocal((s) =>
      withComment(s, {
        version: version.number,
        text: "Το link δεν ανοίγει.",
        isBrokenLink: true,
      }),
    );
  };

  const handleRequestChanges = (note: string) => {
    if (!version) return;
    setLocal((s) => {
      const withNote = note
        ? withComment(s, { version: version.number, text: note })
        : s;
      return withChangeRequest(withNote, version.number);
    });
  };

  return (
    <div className="h34">
      <header className="h34-header">
        <h1>{view.title}</h1>
        <div className="h34-signals">
          <Badge
            tone={local.status === "περιμένει εσένα" ? "attention" : "strong"}
          >
            {local.status}
          </Badge>
          <span className="muted">{view.kindName}</span>
          <span className="muted">
            γύροι αλλαγών: {local.roundsUsed} από {view.rounds.limit}
          </span>
          {local.approvedAt && (
            <span className="muted">
              εγκρίθηκε στις {fmtDate(local.approvedAt)}
            </span>
          )}
        </div>
        <Link href={screenHref(role, "G2", { id: view.productionId })}>
          Η Παραγωγή
        </Link>
        <Link href={screenHref(role, "H3", {})}>Όλα τα Παραδοτέα</Link>
      </header>
      {isCancelled && <p className="h34-warn">Ακυρώθηκε.</p>}
      {!version ? (
        <section className="card">
          <p className="muted">
            Δεν έχει σταλεί ακόμα Έκδοση. Θα ειδοποιηθείς μόλις είναι έτοιμη.
          </p>
        </section>
      ) : (
        <>
          <VersionTabs {...props} />
          <H4Player
            version={version}
            canReportBroken={canAct}
            hasReported={reported.includes(version.number)}
            onReportBroken={handleReportBroken}
          />
          <section className="card">
            <div className="card-title">
              <h2>Σχόλια</h2>
              <span className="muted">{comments.length}</span>
            </div>
            <AnswerLine version={version} local={local} />
            <H4CommentList comments={comments} />
            {canAct && (
              <H4CommentForm
                key={version.number}
                host={version.host}
                onAdd={(text, at) =>
                  setLocal((s) =>
                    withComment(s, { version: version.number, text, at }),
                  )
                }
              />
            )}
          </section>
          {canAct && (
            <H4Decision
              roundsUsed={local.roundsUsed}
              roundsLimit={view.rounds.limit}
              hasClientComments={comments.some(
                (c) => c.isClient && !c.isBrokenLink,
              )}
              onApprove={() => setLocal((s) => withApproval(s, version.number))}
              onRequestChanges={handleRequestChanges}
            />
          )}
        </>
      )}
      {local.status === "εγκρίθηκε" && (
        <H4After
          finalLink={view.finalLink ?? version?.link}
          request={local.request}
          onSubmit={(text) => setLocal((s) => withPostApprovalRequest(s, text))}
        />
      )}
      {local.status === "σε εργασία" && view.versions.length > 0 && (
        <p className="note">
          Η ομάδα δουλεύει πάνω στο Παραδοτέο. Θα ειδοποιηθείς όταν υπάρξει νέα
          Έκδοση.
        </p>
      )}
    </div>
  );
}
