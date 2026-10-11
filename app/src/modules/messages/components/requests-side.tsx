import Link from "next/link";

import { Badge, type Tone } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { daysOpenText, REQUEST_KIND_LABELS, REQUEST_STATE_LABELS, SIDE_EMPTY, SIDE_TITLE, assigneeText } from "../request-labels";
import type { SideRequest } from "../request-helpers";

const TONES: Record<SideRequest["state"], Tone | undefined> = { open: "attention", done: "ok", rejected: undefined };

// Πλαϊνό «Αιτήματα αυτού του Πελάτη»: ανοιχτά πρώτα, με υπεύθυνο και μέρες για τα ανοιχτά.
export function RequestsSide({ items }: { items: readonly SideRequest[] }) {
  return (
    <Panel label={SIDE_TITLE}>
      {items.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">{SIDE_EMPTY}</p>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0">
          {items.map((item) => (
            <li key={item.key} className="grid gap-0.5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={item.href}>
                  <strong>{REQUEST_KIND_LABELS[item.kind]}</strong>
                  {item.text ? ` · ${item.text}` : ""}
                </Link>
                <Badge tone={TONES[item.state]}>{REQUEST_STATE_LABELS[item.state]}</Badge>
              </div>
              {item.state === "open" && item.kind !== "change" && (
                <span className="text-muted-foreground">
                  {assigneeText(item.assigneeName)}
                  {item.daysOpen !== null && ` · ${daysOpenText(item.daysOpen)}`}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
