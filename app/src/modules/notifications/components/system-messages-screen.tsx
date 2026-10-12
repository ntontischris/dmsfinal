import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { SYSTEM_DEFAULTS } from "@/lib/email/system-defaults";
import { isSystemMessageCode } from "@/lib/email/system-texts";

import {
  ALWAYS_ON,
  AUTOMATIONS_PATH,
  EDIT_LABEL,
  EDITED_BADGE,
  MESSAGES_TABS_LABEL,
  SYSTEM_MESSAGES_PATH,
} from "../automation-labels";
import type { SystemMessage } from "../automation-view-schema";

// Η λίστα της K2 (#173) και η εσωτερική πλοήγηση Αυτοματισμοί / Μηνύματα συστήματος.

export function AutomationsSubnav({
  current,
}: {
  current: "automations" | "system";
}) {
  return (
    <Segmented
      label={MESSAGES_TABS_LABEL}
      options={[
        {
          label: "Αυτοματισμοί",
          href: AUTOMATIONS_PATH,
          isCurrent: current === "automations",
        },
        {
          label: "Μηνύματα συστήματος",
          href: SYSTEM_MESSAGES_PATH,
          isCurrent: current === "system",
        },
      ]}
    />
  );
}

export const editedLine = (message: SystemMessage): string | null => {
  if (!message.isEdited) return null;
  const when = new Intl.DateTimeFormat("el-GR", {
    timeZone: "Europe/Athens",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(message.updatedAt));
  return `Τελευταία αλλαγή: ${message.updatedBy ?? "—"}, ${when}`;
};

export function SystemMessageBadges({ message }: { message: SystemMessage }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      <Badge>{ALWAYS_ON}</Badge>
      {message.isEdited && <Badge tone="strong">{EDITED_BADGE}</Badge>}
    </span>
  );
}

export function SystemMessageList({
  messages,
}: {
  messages: readonly SystemMessage[];
}) {
  return (
    <ul className="m-0 grid list-none gap-3 p-0">
      {messages.flatMap((message) => (isSystemMessageCode(message.code) ? [{ message, code: message.code }] : [])).map(({ message, code }) => {
        const defaults = SYSTEM_DEFAULTS[code];
        const edited = editedLine(message);
          return (
            <li
              key={message.code}
              className="grid gap-2 rounded-md border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{defaults.title}</strong>
                <SystemMessageBadges message={message} />
              </div>
              <p className="m-0 text-sm text-muted-foreground">
                {defaults.when}
              </p>
              {edited && (
                <p className="m-0 text-sm text-muted-foreground">{edited}</p>
              )}
              <div>
                <Link
                  className={buttonVariants({ size: "sm" })}
                  href={`${SYSTEM_MESSAGES_PATH}/${message.code}`}
                >
                  {EDIT_LABEL}
                  <span className="sr-only">: {defaults.title}</span>
                </Link>
              </div>
            </li>
          );
        })}
    </ul>
  );
}
