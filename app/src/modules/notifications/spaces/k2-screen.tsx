import Link from "next/link";
import type { ReactNode } from "react";

import { SYSTEM_DEFAULTS } from "@/lib/email/system-defaults";
import { isSystemMessageCode } from "@/lib/email/system-texts";
import { can, getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { SYSTEM_MESSAGES_PATH } from "../automation-labels";
import type { SystemMessage } from "../automation-view-schema";
import { getSystemMessages } from "../queries-automations";
import { KSubnav } from "./k-subnav";
import { SystemMessageEditor } from "./k2-editor";
import { whenEdited } from "./k2-model";

import "../../finance/spaces/money-lines.css";
import "./k2.css";

interface FrameProps {
  hero: ReactNode;
  children: ReactNode;
}

function Frame({ hero, children }: FrameProps) {
  return (
    <div data-spaces>
      {hero}
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

function MessageTags({ message }: { message: SystemMessage }) {
  return (
    <>
      <span className="ml-tag">πάντα ενεργό</span>
      {message.isEdited && <span className="ml-tag">αλλαγμένο κείμενο</span>}
    </>
  );
}

// Η λίστα είναι οθόνη λεπτομέρειας (DETAIL_SCREENS): το h1 το γράφει η ίδια.
function ListHero({ count }: { count: number }) {
  return (
    <header className="ml-hero k2-hero">
      <div>
        <h1>Μηνύματα συστήματος</h1>
        <p>{`${count} μηνύματα · πάντα ενεργά, αλλάζει μόνο το κείμενο`}</p>
      </div>
    </header>
  );
}

const knownOf = (messages: readonly SystemMessage[]) =>
  messages.flatMap((message) =>
    isSystemMessageCode(message.code)
      ? [{ message, defaults: SYSTEM_DEFAULTS[message.code] }]
      : [],
  );

function MessageList({ messages }: { messages: readonly SystemMessage[] }) {
  return (
    <ul className="ml-list k2-list">
      {knownOf(messages).map(({ message, defaults }) => (
        <li key={message.code} className="ml-line k2-item">
          <span className="ml-thumb" aria-hidden="true">
            @
          </span>
          <span className="ml-main">
            <strong>{defaults.title}</strong>
            <small>
              {message.isEdited
                ? `${defaults.when} · Τελευταία αλλαγή: ${whenEdited(message)}`
                : defaults.when}
            </small>
          </span>
          <span className="k2-meta">
            <MessageTags message={message} />
          </span>
          <span className="ml-quick">
            <Link href={messageHref(message.code)}>Επεξεργασία</Link>
          </span>
        </li>
      ))}
    </ul>
  );
}

// K2 Μηνύματα συστήματος στη νέα εμφάνιση (prototype `screens/K2.tsx`): πάντα ενεργά, αλλάζει μόνο το κείμενο.
export async function SpacesSystemMessages() {
  if (!can(await getViewer(), "automations.manage")) return <Denied />;
  const messages = await getSystemMessages();
  if (!messages.ok || !messages.data) return <Failed />;
  return (
    <Frame hero={<ListHero count={knownOf(messages.data).length} />}>
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

// Η σελίδα ενός Μηνύματος: το όνομά του είναι το h1 (`data-page-title`), με πότε φεύγει και τα σήματα.
function MessageHero({ message }: { message: SystemMessage }) {
  if (!isSystemMessageCode(message.code)) return null;
  const defaults = SYSTEM_DEFAULTS[message.code];
  return (
    <header className="ml-hero k2-hero">
      <span className="ml-hero-mono" aria-hidden="true">
        @
      </span>
      <div>
        <span className="k2-meta">
          <MessageTags message={message} />
        </span>
        <h1 data-page-title>{defaults.title}</h1>
        <p>{defaults.when}</p>
        {message.isEdited && <p>Αλλαγή από: {whenEdited(message)}</p>}
      </div>
      <div className="ml-quick">
        <Link href={SYSTEM_MESSAGES_PATH}>Όλα τα Μηνύματα συστήματος</Link>
      </div>
    </header>
  );
}

function Editor({ message }: { message: SystemMessage }) {
  if (!isSystemMessageCode(message.code)) return null;
  const defaults = SYSTEM_DEFAULTS[message.code];
  const required = message.required.map((v) => `{${v}}`).join(", ");
  return (
    <div className="ml-stack">
      <SystemMessageEditor
        key={message.isEdited ? "edited" : message.updatedAt}
        message={message}
        defaults={defaults}
      >
        <p className="note">{defaults.note}</p>
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
    </div>
  );
}

// K2: ο editor ενός Μηνύματος συστήματος.
export async function SpacesSystemMessage({ code }: { code: string }) {
  if (!can(await getViewer(), "automations.manage")) return <Denied />;
  const messages = isSystemMessageCode(code) ? await getSystemMessages() : null;
  if (messages?.ok === false) return <Failed />;
  const message = messages?.data?.find((item) => item.code === code);
  return (
    <Frame
      hero={
        message ? (
          <MessageHero message={message} />
        ) : (
          <h1 data-page-title>Μηνύματα συστήματος</h1>
        )
      }
    >
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
