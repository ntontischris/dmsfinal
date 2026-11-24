import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { hrefOf } from "@/spaces/data/screens";

import {
  ignoreFailedSend,
  resendFailedSend,
  retryStuckEvent,
} from "../actions";
import { ACTIONS_NOTE, AI, EVENTS, GOOGLE, SENDS } from "../labels";
import type { P2Ai, P2Model } from "./p2-adapter";
import { ConfirmAction } from "./p2-confirm";
import { HealthCard, RedNote } from "./p2-parts";

// Μία γραμμή που θέλει ενέργεια: τίτλος, υπότιτλος, ετικέτα και τα κουμπιά της.
function ActionLine({
  title,
  sub,
  tag,
  children,
}: {
  title: string;
  sub: string;
  tag: string;
  children: ReactNode;
}) {
  return (
    <li className="ml-line">
      <span className="ml-main">
        <strong>{title}</strong>
        <small>{sub}</small>
      </span>
      <span className="ml-tag" data-attention="true">
        {tag}
      </span>
      <span className="ml-quick">{children}</span>
    </li>
  );
}

export function FailedSendsCard({
  items,
  total,
  more,
}: {
  items: P2Model["sends"];
  total: number;
  more: string | null;
}) {
  return (
    <HealthCard title={SENDS.title} red={total > 0}>
      {items.length === 0 ? (
        <p className="muted">{SENDS.empty}</p>
      ) : (
        <ul className="ml-list">
          {items.map((s) => (
            <ActionLine key={s.id} title={s.title} sub={s.sub} tag="απέτυχε">
              {s.retryRef && (
                <ConfirmAction
                  label={SENDS.resend}
                  confirm={SENDS.resendConfirm}
                  action={resendFailedSend}
                  fields={{ ref: s.retryRef }}
                  isPrimary
                />
              )}
              <ConfirmAction
                label={SENDS.ignore}
                confirm={SENDS.ignoreConfirm}
                action={ignoreFailedSend}
                fields={{ ref: s.id }}
              />
            </ActionLine>
          ))}
        </ul>
      )}
      {more && <p className="muted">{more}</p>}
      {total > 0 && (
        <>
          <p className="note">{ACTIONS_NOTE}</p>
          <RedNote event={51} />
        </>
      )}
      <Link href={hrefOf("K3", { tab: "failed" })}>{SENDS.history}</Link>
    </HealthCard>
  );
}

export function GoogleSyncCard({ google }: { google: P2Model["google"] }) {
  return (
    <HealthCard
      title={GOOGLE.title}
      red={google.isRed}
      status={google.badge.label}
    >
      {google.reason && <p className="note">{google.reason}</p>}
      <dl className="ml-kv">
        <dt>{GOOGLE.lastSync}</dt>
        <dd>{google.lastSync}</dd>
        <dt>{GOOGLE.queued}</dt>
        <dd>{google.queued}</dd>
      </dl>
      <p className="muted">{GOOGLE.rule}</p>
    </HealthCard>
  );
}

export function StuckEventsCard({
  items,
  waiting,
  isRed,
}: {
  items: P2Model["events"];
  waiting: string | null;
  isRed: boolean;
}) {
  return (
    <HealthCard title={EVENTS.title} red={isRed}>
      {items.length === 0 ? (
        <p className="muted">{EVENTS.empty}</p>
      ) : (
        <ul className="ml-list">
          {items.map((e) => (
            <ActionLine key={e.id} title={e.title} sub={e.sub} tag="κόλλησε">
              <ConfirmAction
                label={EVENTS.retry}
                confirm={EVENTS.retryConfirm}
                action={retryStuckEvent}
                fields={{ id: String(e.id) }}
              />
            </ActionLine>
          ))}
        </ul>
      )}
      {waiting && <p>{waiting}</p>}
      {isRed && (
        <>
          <p className="note">{ACTIONS_NOTE}</p>
          <RedNote event={53} />
        </>
      )}
    </HealthCard>
  );
}

function AiMeter({ ai }: { ai: P2Ai }) {
  const percent = Math.min(
    100,
    Math.round((ai.usedDollars / Math.max(1, ai.capDollars)) * 100),
  );
  return (
    <div
      className="ml-meter"
      role="meter"
      aria-label={`Χρήση ${ai.usedDollars} από ${ai.capDollars}`}
      aria-valuemin={0}
      aria-valuemax={ai.capDollars}
      aria-valuenow={ai.usedDollars}
      data-tone={ai.isRed ? "warn" : undefined}
      style={{ "--v": `${percent}%` } as CSSProperties}
    >
      <span>Χρήση</span>
      <i>
        <b />
      </i>
      <strong>{percent}%</strong>
    </div>
  );
}

export function AssistantCapCard({
  ai,
  isOwner,
}: {
  ai: P2Ai;
  isOwner: boolean;
}) {
  return (
    <HealthCard title={AI.title} red={ai.isRed}>
      {ai.isClosed ? (
        <p>{AI.closed}</p>
      ) : (
        <>
          <p>{ai.text}</p>
          <AiMeter ai={ai} />
        </>
      )}
      <p className="muted">{ai.rule}</p>
      {ai.isRed && <RedNote event={57} />}
      {isOwner ? (
        <p className="ml-actions">
          <Link href={hrefOf("O1")}>Όρια στις Ρυθμίσεις (O1)</Link>
          <Link href={hrefOf("O8")}>Χρήση και συνδρομές (O8)</Link>
        </p>
      ) : (
        <p className="muted">{AI.changeOthers}</p>
      )}
    </HealthCard>
  );
}
