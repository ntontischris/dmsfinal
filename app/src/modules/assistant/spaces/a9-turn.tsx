import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar } from "@/spaces/kit/parts";

import type { AssistantAudience } from "../components/assistant-turn";
import type { SourceView } from "../events";
import {
  CHAT_LINK_TEXT,
  RECORDED_TEXT,
  ROUTED_TEXT,
  SEARCH_LINK_TEXT,
  UNAVAILABLE_TEXT,
} from "../labels";
import type { Turn } from "../use-assistant";

// Μία ερώτηση και η απάντησή της, όπως στο prototype (`screens/a9-chat.tsx`): φούσκα ερώτησης, avatar Βοηθού, πηγές.

export function Answer({ children }: { children: ReactNode }) {
  return (
    <div className="a9-row">
      <Avatar name="Βοηθός" size={28} />
      <div className="a9-a">{children}</div>
    </div>
  );
}

function SourceChips({ sources }: { sources: readonly SourceView[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="a9-chips" aria-label="Πηγές">
      {sources.map((source) =>
        source.href ? (
          <Link
            key={`${source.kind}:${source.id}`}
            className="a9-chip"
            href={source.href}
          >
            {source.title}
          </Link>
        ) : (
          <span key={`${source.kind}:${source.id}`} className="a9-chip">
            {source.kind === "package"
              ? `${source.title} (Κατάλογος)`
              : source.title}
          </span>
        ),
      )}
    </div>
  );
}

// Ο πελάτης γράφει στη Συνομιλία· η ομάδα ψάχνει στη Γνώση (με την ερώτηση, όταν υπάρχει).
export function Referral({
  audience,
  question,
}: {
  audience: AssistantAudience;
  question?: string;
}) {
  if (audience === "client")
    return (
      <Link className="button" href="/app/messages">
        {CHAT_LINK_TEXT}
      </Link>
    );
  const href = question
    ? `/app/knowledge?${new URLSearchParams({ q: question }).toString()}`
    : "/app/knowledge";
  return (
    <Link className="button" href={href}>
      {SEARCH_LINK_TEXT}
    </Link>
  );
}

function AnswerBody({
  turn,
  audience,
}: {
  turn: Turn;
  audience: AssistantAudience;
}) {
  if (turn.status === "unavailable")
    return (
      <>
        <p>{UNAVAILABLE_TEXT[turn.reason ?? "unavailable"]}</p>
        <Referral audience={audience} />
      </>
    );
  if (turn.status === "unknown")
    return (
      <>
        <p>{turn.answer}</p>
        {audience === "team" && <p>{ROUTED_TEXT}</p>}
        <Referral audience={audience} question={turn.question} />
        {audience === "team" && <p className="muted">{RECORDED_TEXT}</p>}
      </>
    );
  if (turn.status === "error") return <p className="a9-error">{turn.answer}</p>;
  return (
    <>
      <p className="a9-text">{turn.answer || "…"}</p>
      {turn.status === "done" && <SourceChips sources={turn.sources} />}
    </>
  );
}

export function A9Turn({
  turn,
  audience,
}: {
  turn: Turn;
  audience: AssistantAudience;
}) {
  return (
    <li className="a9-turn">
      <div className="a9-q">{turn.question}</div>
      <div className="a9-row" aria-busy={turn.status === "streaming"}>
        <Avatar name="Βοηθός" size={28} />
        <div
          className={turn.status === "unavailable" ? "a9-a a9-capped" : "a9-a"}
        >
          <AnswerBody turn={turn} audience={audience} />
        </div>
      </div>
    </li>
  );
}
