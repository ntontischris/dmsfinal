import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/segmented";

import {
  AUTOMATIONS_PATH,
  CHANNEL_LABELS,
  INBOX_TAB,
  LOCKED_TEXT,
  PREFS_CLIENT_NOTE,
  PREFS_CONFIGURE,
  PREFS_EMPTY_TEXT,
  PREFS_EMPTY_TITLE,
  PREFS_SELF_NOTE,
  PREFS_TAB,
  PREFS_TABS_LABEL,
  PREFS_TEAM_NOTE,
} from "../automation-labels";
import type { Pref } from "../automation-view-schema";
import { PrefToggle } from "./pref-toggle";

// A2 «Προτιμήσεις» (#173, Α10): ομαδοποίηση ανά Γεγονός, «Λαμβάνω» ανά Αυτοματισμό, τα απαραίτητα κλειδωμένα για πελάτη.

export function NotificationsTabs({ current }: { current: "inbox" | "prefs" }) {
  return (
    <Tabs
      label={PREFS_TABS_LABEL}
      options={[
        {
          label: INBOX_TAB,
          href: "/app/notifications",
          isCurrent: current === "inbox",
        },
        {
          label: PREFS_TAB,
          href: "/app/notifications?tab=prefs",
          isCurrent: current === "prefs",
        },
      ]}
    />
  );
}

const groupByEvent = (prefs: readonly Pref[]): [string, Pref[]][] =>
  Object.entries(
    prefs.reduce<Record<string, Pref[]>>(
      (groups, pref) => ({
        ...groups,
        [pref.eventLabel]: [...(groups[pref.eventLabel] ?? []), pref],
      }),
      {},
    ),
  );

function PrefRow({ pref, index }: { pref: Pref; index: number }) {
  const channel = CHANNEL_LABELS[pref.channel];
  const name = `${pref.eventLabel} · ${channel}${index > 0 ? ` ${index + 1}` : ""}`;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-b-0">
      <span className="flex flex-wrap items-center gap-2 text-sm">
        <Badge>{channel}</Badge>
        {!pref.canMute && (
          <span className="text-muted-foreground">{LOCKED_TEXT}</span>
        )}
      </span>
      <PrefToggle
        automationId={pref.automationId}
        receive={pref.receive}
        canMute={pref.canMute}
        name={name}
      />
    </li>
  );
}

interface PrefsTabProps {
  prefs: readonly Pref[];
  isClient: boolean;
  canConfigure: boolean;
  language: ReactNode;
}

export function PrefsTab({
  prefs,
  isClient,
  canConfigure,
  language,
}: PrefsTabProps) {
  return (
    <section className="grid gap-4" aria-label={PREFS_TAB}>
      <p className="m-0 text-sm text-muted-foreground">
        {isClient ? PREFS_CLIENT_NOTE : PREFS_TEAM_NOTE}
      </p>
      {prefs.length === 0 ? (
        <Notice kind="empty" title={PREFS_EMPTY_TITLE}>
          <p className="m-0">{PREFS_EMPTY_TEXT}</p>
        </Notice>
      ) : (
        groupByEvent(prefs).map(([label, rows]) => (
          <Panel key={label} label={label}>
            <ul className="m-0 list-none p-0">
              {rows.map((pref, index) => (
                <PrefRow
                  key={pref.automationId}
                  pref={pref}
                  index={
                    rows
                      .slice(0, index)
                      .filter((r) => r.channel === pref.channel).length
                  }
                />
              ))}
            </ul>
          </Panel>
        ))
      )}
      <p className="m-0 text-sm text-muted-foreground">{PREFS_SELF_NOTE}</p>
      {canConfigure && (
        <p className="m-0">
          <Link href={AUTOMATIONS_PATH}>{PREFS_CONFIGURE}</Link>
        </p>
      )}
      {language}
    </section>
  );
}
