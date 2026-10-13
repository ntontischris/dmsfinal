import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import {
  CHAT_LINK_TEXT,
  RECORDED_TEXT,
  ROUTED_TEXT,
  SEARCH_LINK_TEXT,
  UNAVAILABLE_TEXT,
} from "../labels";
import type { SourceView } from "../events";
import type { Turn } from "../use-assistant";

// Μία ερώτηση και η απάντησή της, όπως στο prototype (a9-chat).

export type AssistantAudience = "team" | "client";

const BUBBLE =
  "min-w-0 max-w-[92%] rounded-md border px-3 py-2 text-sm [overflow-wrap:anywhere]";

function SourceChips({ sources }: { sources: readonly SourceView[] }) {
  if (sources.length === 0) return null;
  return (
    <ul
      aria-label="Πηγές"
      className="m-0 mt-2 flex list-none flex-wrap gap-1 p-0"
    >
      {sources.map((source) => (
        <li
          key={`${source.kind}:${source.id}`}
          className="min-w-0 rounded-full border px-2 text-sm"
        >
          {source.href ? (
            <Link href={source.href}>{source.title}</Link>
          ) : (
            <span>
              {source.kind === "package"
                ? `${source.title} (Κατάλογος)`
                : source.title}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

const linkButton = buttonVariants({ size: "sm" });

function Referral({
  audience,
  question,
}: {
  audience: AssistantAudience;
  question?: string;
}) {
  if (audience === "client")
    return (
      <Link className={linkButton} href="/app/messages">
        {CHAT_LINK_TEXT}
      </Link>
    );
  const href = question
    ? `/app/knowledge?${new URLSearchParams({ q: question }).toString()}`
    : "/app/knowledge";
  return (
    <Link className={linkButton} href={href}>
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
      <div className="grid justify-items-start gap-2" role="status">
        <p className="m-0">{UNAVAILABLE_TEXT[turn.reason ?? "unavailable"]}</p>
        <Referral audience={audience} />
      </div>
    );
  if (turn.status === "unknown")
    return (
      <div className="grid justify-items-start gap-2">
        <p className="m-0">{turn.answer}</p>
        {audience === "team" && <p className="m-0">{ROUTED_TEXT}</p>}
        <Referral audience={audience} question={turn.question} />
        <p className="m-0 text-muted-foreground">{RECORDED_TEXT}</p>
      </div>
    );
  if (turn.status === "error")
    return (
      <p className="m-0 text-destructive" role="alert">
        {turn.answer}
      </p>
    );
  return (
    <>
      <p className="m-0 whitespace-pre-wrap">{turn.answer || "…"}</p>
      {turn.status === "done" && <SourceChips sources={turn.sources} />}
    </>
  );
}

export function AssistantTurn({
  turn,
  audience,
}: {
  turn: Turn;
  audience: AssistantAudience;
}) {
  return (
    <li className="grid gap-2">
      <p className={`${BUBBLE} m-0 justify-self-end border-primary`}>
        {turn.question}
      </p>
      <div
        className={`${BUBBLE} justify-self-start`}
        aria-busy={turn.status === "streaming"}
      >
        <AnswerBody turn={turn} audience={audience} />
      </div>
    </li>
  );
}
