import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { checkConnectionNow } from "../actions";
import type { ConnectionStatus, ConnectionUsage } from "../connections";
import {
  CONNECTION_TEXTS,
  NOT_SET_UP_NOTE,
  STATE_LABELS,
  STATE_TONES,
  formatAt,
  formatUsage,
  usageRatio,
} from "../labels";
import { IntegrationForm } from "./integration-form";

function UsageMeter({ usage }: { usage: ConnectionUsage }) {
  const ratio = usageRatio(usage);
  return (
    <div className="grid gap-1.5 text-sm">
      <div className="flex flex-wrap justify-between gap-2">
        <span className="text-muted-foreground">{usage.label}</span>
        <span className="tabular-nums">
          {formatUsage(usage)} · <strong>{Math.round(ratio * 100)}%</strong>
        </span>
      </div>
      <div
        role="meter"
        aria-label={`Χρήση: ${usage.label}`}
        aria-valuemin={0}
        aria-valuemax={usage.limit}
        aria-valuenow={usage.used}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <span
          className={
            ratio >= 0.7
              ? "block h-full bg-destructive"
              : "block h-full bg-primary"
          }
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

function Facts({ item }: { item: ConnectionStatus }) {
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt className="text-muted-foreground">Τελευταία επιτυχία</dt>
      <dd className="m-0">{formatAt(item.lastSuccessAt)}</dd>
      {item.lastCheck && (
        <>
          <dt className="text-muted-foreground">Τελευταίος έλεγχος</dt>
          <dd className="m-0">
            {formatAt(item.lastCheck.at)} ·{" "}
            {item.lastCheck.isOk
              ? "απάντησε"
              : `απέτυχε (${item.lastCheck.error ?? "—"})`}
          </dd>
        </>
      )}
      {item.models.map((model) => (
        <div key={model.id} className="contents">
          <dt className="text-muted-foreground">Μοντέλο: {model.label}</dt>
          <dd className="m-0 font-mono">{model.id}</dd>
        </div>
      ))}
    </dl>
  );
}

interface ConnectionCardProps {
  item: ConnectionStatus;
  children?: ReactNode;
}

// Μία κάρτα ανά σύνδεση (Ν9): κατάσταση, τελευταία επιτυχία, χρήση απέναντι στο όριο, «Έλεγχος τώρα».
export function ConnectionCard({ item, children }: ConnectionCardProps) {
  const text = CONNECTION_TEXTS[item.id];
  return (
    <Panel
      label={text.name}
      aside={
        <Badge tone={STATE_TONES[item.state]}>{STATE_LABELS[item.state]}</Badge>
      }
    >
      <div className="grid gap-4" data-connection={item.id}>
        <p className="m-0 text-sm text-muted-foreground">{text.purpose}</p>
        {item.state === "not_set_up" && (
          <p className="m-0 text-sm">{NOT_SET_UP_NOTE}</p>
        )}
        {item.reason && (
          <p className="m-0 text-sm text-destructive">{item.reason}</p>
        )}
        <Facts item={item} />
        {item.usage && <UsageMeter usage={item.usage} />}
        {children}
        {item.isCheckable && (
          <IntegrationForm
            action={checkConnectionNow}
            submitLabel="Έλεγχος τώρα"
            pendingLabel="Έλεγχος…"
          >
            <input type="hidden" name="connection" value={item.id} />
          </IntegrationForm>
        )}
        <p className="m-0 text-xs text-muted-foreground">
          Αλλάζει ο developer: {text.developerOnly}
        </p>
      </div>
    </Panel>
  );
}
