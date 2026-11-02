import Link from "next/link";

import { ListRow, Meter, RowList } from "@/spaces/kit/parts";
import { hrefOf } from "@/spaces/data/screens";
import { Badge } from "@/spaces/screens/shared";

import {
  ignoreFailedSend,
  resendFailedSend,
  retryStuckEvent,
} from "../actions";
import { ACTIONS_NOTE, AI, EVENTS, GOOGLE, SENDS } from "../labels";
import type { P2Ai, P2Model } from "./p2-adapter";
import { ConfirmAction } from "./p2-confirm";
import { HealthCard, RedNote } from "./p2-parts";

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
        <RowList>
          {items.map((s) => (
            <ListRow
              key={s.id}
              title={s.title}
              sub={s.sub}
              aside={
                <>
                  <Badge tone="attention">απέτυχε</Badge>
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
                </>
              }
            />
          ))}
        </RowList>
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
      badge={<Badge tone={google.badge.tone}>{google.badge.label}</Badge>}
    >
      {google.reason && <p className="note">{google.reason}</p>}
      <RowList>
        <ListRow
          title={GOOGLE.lastSync}
          aside={<strong>{google.lastSync}</strong>}
        />
        <ListRow
          title={GOOGLE.queued}
          aside={<strong>{google.queued}</strong>}
        />
      </RowList>
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
        <RowList>
          {items.map((e) => (
            <ListRow
              key={e.id}
              title={e.title}
              sub={e.sub}
              aside={
                <>
                  <Badge tone="attention">κόλλησε</Badge>
                  <ConfirmAction
                    label={EVENTS.retry}
                    confirm={EVENTS.retryConfirm}
                    action={retryStuckEvent}
                    fields={{ id: String(e.id) }}
                  />
                </>
              }
            />
          ))}
        </RowList>
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
          <Meter
            label="Χρήση"
            used={ai.usedDollars}
            total={ai.capDollars}
            tone={ai.isRed ? "attention" : undefined}
          />
        </>
      )}
      <p className="muted">{ai.rule}</p>
      {ai.isRed && <RedNote event={57} />}
      {isOwner ? (
        <div className="btn-row">
          <Link href={hrefOf("O1")}>Όρια στις Ρυθμίσεις (O1)</Link>
          <Link href={hrefOf("O8")}>Χρήση και συνδρομές (O8)</Link>
        </div>
      ) : (
        <p className="muted">{AI.changeOthers}</p>
      )}
    </HealthCard>
  );
}
