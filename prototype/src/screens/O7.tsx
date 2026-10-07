import Link from "next/link";

import { settingsCapsOf } from "@/data/settings-access";
import { SettingsTabs } from "@/screens/o-shared";
import { linesFor, ReadyDefaults, RequiredLines } from "@/screens/o7-lines";
import {
  OpenButton,
  OpenConfirm,
  OpenedNotice,
  WaitingCard,
} from "@/screens/o7-open";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./o7.css";

const VARIANTS: readonly { view: string | undefined; label: string }[] = [
  { view: undefined, label: "μετά το άνοιγμα" },
  { view: "before", label: "πριν το άνοιγμα" },
  { view: "ready", label: "όλα έτοιμα" },
];

// O7 «Έλεγχος ετοιμότητας»: Ιδιοκτήτης και Διαχείριση· το «Άνοιγμα» μόνο ο Ιδιοκτήτης.
export function O7({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = settingsCapsOf(role);
  const header = (
    <StateSwitcher
      role={role}
      code="O7"
      state={state}
      keep={{ ...query, state: undefined }}
    />
  );
  if (!caps.canManageSettings)
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τον Έλεγχο ετοιμότητας τον βλέπουν ο Ιδιοκτήτης και η Διαχείριση.
        </StateNotice>
      </>
    );
  if (state === "error")
    return (
      <>
        {header}
        <SettingsTabs role={role} code="O7" />
        <ErrorNotice what="τον έλεγχο ετοιμότητας" />
      </>
    );
  const isEmpty = state === "empty";
  const isOpened =
    (query.view === undefined || query.view === "opened") && !isEmpty;
  const allReady = !isEmpty && (query.view === "ready" || isOpened);
  const lines = linesFor(isEmpty, allReady, query.confirm);
  const pending = lines.filter((line) => !line.done).length;
  const isConfirming =
    query.open === "confirm" && caps.isOwner && pending === 0 && !isOpened;
  return (
    <>
      {header}
      <SettingsTabs role={role} code="O7" />
      <nav className="o7-switch" aria-label="Όψη ελέγχου">
        <span>Όψη:</span>{" "}
        {VARIANTS.map((item, index) => (
          <span key={item.label}>
            {index > 0 && "· "}
            <Link
              href={screenHref(role, "O7", { view: item.view })}
              aria-current={item.view === query.view}
            >
              {item.label}
            </Link>
          </span>
        ))}
      </nav>
      {isOpened ? (
        <OpenedNotice />
      ) : (
        <>
          {isEmpty && (
            <p className="note" role="status">
              Πρώτο στήσιμο: όλες οι γραμμές εκκρεμούν. Ό,τι έχει προεπιλογή δεν
              χρειάζεται συμπλήρωση.
            </p>
          )}
          <p>
            <strong>
              {lines.length - pending} από {lines.length} έτοιμα
            </strong>{" "}
            · {pending} εκκρεμούν
          </p>
        </>
      )}
      <RequiredLines
        role={role}
        lines={lines}
        isOwner={caps.isOwner}
        isLocked={isOpened}
      />
      <ReadyDefaults role={role} />
      {!isOpened && <WaitingCard />}
      {isConfirming && <OpenConfirm role={role} choice={query.queue} />}
      {!isOpened && !isConfirming && (
        <OpenButton role={role} isOwner={caps.isOwner} pending={pending} />
      )}
    </>
  );
}
