import Link from "next/link";
import type { ReactNode } from "react";

import { SYSTEM_DEFAULTS } from "@/lib/email/system-defaults";
import { isSystemMessageCode } from "@/lib/email/system-texts";
import { can, getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { SYSTEM_MESSAGES_PATH } from "../automation-labels";
import type { SystemMessage } from "../automation-view-schema";
import { getSystemMessages } from "../queries-automations";
import { KSubnav } from "./k-subnav";
import { SystemMessageEditor } from "./k2-editor";
import { whenEdited } from "./k2-model";

import "./k2.css";

function Frame({ children }: { children: ReactNode }) {
  return (
    <div data-spaces>
      <KSubnav current="system" />
      {children}
      <p className="note">
        Οι αυτόματες ειδοποιήσεις προς Χρήστες ρυθμίζονται στους{" "}
        <Link href={hrefOf("K1")}>Αυτοματισμούς</Link>.
      </p>
    </div>
  );
}

function Denied() {
  return (
    <div data-spaces>
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        Τα Μηνύματα συστήματος τα διαχειρίζεται όποιος «Διαχειρίζεται
        Αυτοματισμούς».
      </StateNotice>
    </div>
  );
}

function Failed() {
  return (
    <div data-spaces>
      <ErrorNotice what="τα Μηνύματα συστήματος" />
    </div>
  );
}

const messageHref = (code: string): string =>
  `${SYSTEM_MESSAGES_PATH}/${encodeURIComponent(code)}`;

function MessageBadges({ message }: { message: SystemMessage }) {
  return (
    <>
      <Badge>πάντα ενεργό</Badge>
      {message.isEdited && <Badge tone="strong">αλλαγμένο κείμενο</Badge>}
    </>
  );
}

function MessageList({ messages }: { messages: readonly SystemMessage[] }) {
  const known = messages.flatMap((message) =>
    isSystemMessageCode(message.code)
      ? [{ message, defaults: SYSTEM_DEFAULTS[message.code] }]
      : [],
  );
  return (
    <Panel
      label="Μηνύματα συστήματος"
      aside={`${known.length} μηνύματα`}
      isFlush
    >
      <RowList>
        {known.map(({ message, defaults }) => (
          <ListRow
            key={message.code}
            title={defaults.title}
            sub={
              message.isEdited
                ? `${defaults.when} · Τελευταία αλλαγή: ${whenEdited(message)}`
                : defaults.when
            }
            aside={
              <>
                <MessageBadges message={message} />
                <Link className="button" href={messageHref(message.code)}>
                  Επεξεργασία
                </Link>
              </>
            }
          />
        ))}
      </RowList>
    </Panel>
  );
}

// K2 Μηνύματα συστήματος στη νέα εμφάνιση (prototype `screens/K2.tsx`): πάντα ενεργά, αλλάζει μόνο το κείμενο.
export async function SpacesSystemMessages() {
  if (!can(await getViewer(), "automations.manage")) return <Denied />;
  const messages = await getSystemMessages();
  if (!messages.ok || !messages.data) return <Failed />;
  return (
    <Frame>
      <MessageList messages={messages.data} />
    </Frame>
  );
}

function Variables({ message }: { message: SystemMessage }) {
  return (
    <ul className="k2-vars">
      {message.variables.map((v) => {
        const isRequired = message.required.includes(v);
        return (
          <li key={v} className="k2-var" data-required={isRequired}>
            {`{${v}}`}
            {isRequired && " (απαραίτητη)"}
          </li>
        );
      })}
    </ul>
  );
}

function Editor({ message }: { message: SystemMessage }) {
  if (!isSystemMessageCode(message.code)) return null;
  const defaults = SYSTEM_DEFAULTS[message.code];
  const required = message.required.map((v) => `{${v}}`).join(", ");
  return (
    <>
      <p>
        <Link href={SYSTEM_MESSAGES_PATH}>← Όλα τα Μηνύματα συστήματος</Link>
      </p>
      <SystemMessageEditor
        key={message.isEdited ? "edited" : message.updatedAt}
        message={message}
        defaults={defaults}
        aside={
          <span className="k2-meta">
            <MessageBadges message={message} />
          </span>
        }
      >
        <p className="muted">{defaults.when}</p>
        <p className="muted">{defaults.note}</p>
        {message.isEdited && (
          <p className="muted">Αλλαγή από: {whenEdited(message)}</p>
        )}
        <p className="note">
          Δεν υπάρχει διακόπτης: αυτό το μήνυμα χρειάζεται για να δουλέψει το
          σύστημα. Αλλάζεις μόνο το κείμενο· το κουμπί και ο κωδικός μπαίνουν
          πάντα από το σύστημα.
        </p>
        <h3>Μεταβλητές</h3>
        <Variables message={message} />
        {required && (
          <p className="note">
            Χωρίς {required} η λειτουργία σπάει· το κείμενο δεν αποθηκεύεται αν
            λείπει.
          </p>
        )}
      </SystemMessageEditor>
      <p className="note">
        Κάθε αλλαγή γράφεται στο Ίχνος ενεργειών (ποιος, πότε, τι).
      </p>
    </>
  );
}

// K2: ο editor ενός Μηνύματος συστήματος.
export async function SpacesSystemMessage({ code }: { code: string }) {
  if (!can(await getViewer(), "automations.manage")) return <Denied />;
  const messages = isSystemMessageCode(code) ? await getSystemMessages() : null;
  if (messages?.ok === false) return <Failed />;
  const message = messages?.data?.find((item) => item.code === code);
  return (
    <Frame>
      {message ? (
        <Editor message={message} />
      ) : (
        <StateNotice kind="empty" title="Δεν υπάρχει αυτό το Μήνυμα">
          <Link href={SYSTEM_MESSAGES_PATH}>Όλα τα Μηνύματα συστήματος</Link>
        </StateNotice>
      )}
    </Frame>
  );
}
