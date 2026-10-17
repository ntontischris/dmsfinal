import Link from "next/link";

import { ignoreFailedSend, resendFailedSend } from "../actions";
import { ACTIONS_NOTE, SENDS, formatAt, redNote } from "../labels";
import type { FailedSend } from "../schemas";
import { sectionVerdict } from "../status";
import { ConfirmAction } from "./confirm-action";
import { HealthCard } from "./health-card";

function SendItem({ send }: { send: FailedSend }) {
  return (
    <li
      className="grid gap-1 border-t pt-2 first:border-t-0 first:pt-0"
      data-send={send.id}
    >
      <span>
        <strong>«{send.what}»</strong> προς {send.recipient ?? "—"}
        {send.email && send.email !== send.recipient && (
          <span className="text-muted-foreground"> ({send.email})</span>
        )}
      </span>
      <span className="text-sm text-muted-foreground">
        {formatAt(send.at)}
        {send.reason && ` · ${SENDS.reason}: ${send.reason}`}
      </span>
      <div className="flex flex-wrap items-start gap-2">
        {send.retryRef && (
          <ConfirmAction
            label={SENDS.resend}
            confirm={SENDS.resendConfirm}
            action={resendFailedSend}
            fields={{ ref: send.retryRef }}
            isPrimary
          />
        )}
        <ConfirmAction
          label={SENDS.ignore}
          confirm={SENDS.ignoreConfirm}
          action={ignoreFailedSend}
          fields={{ ref: send.id }}
        />
      </div>
    </li>
  );
}

// Οι αποστολές που απέτυχαν οριστικά τις τελευταίες 7 μέρες (Γεγονός 51), με «Ξαναστείλε» και «Αγνόησε».
export function SendsCard({
  items,
  total,
}: {
  items: readonly FailedSend[];
  total: number;
}) {
  return (
    <HealthCard title={SENDS.title} verdict={sectionVerdict(total > 0)}>
      {items.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">{SENDS.empty}</p>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {items.map((send) => (
            <SendItem key={send.id} send={send} />
          ))}
        </ul>
      )}
      {total > items.length && (
        <p className="m-0 text-sm">{SENDS.more(items.length, total)}</p>
      )}
      {total > 0 && (
        <p className="m-0 text-sm text-muted-foreground">
          {ACTIONS_NOTE} {redNote(51)}
        </p>
      )}
      <p className="m-0 text-sm">
        <Link href="/app/settings/sends?tab=failed">{SENDS.history}</Link>
      </p>
    </HealthCard>
  );
}
