import Link from "next/link";

import { ASSISTANT_LIMITS } from "@/data/knowledge";
import type { RoleId } from "@/data/roles";
import {
  Messages,
  Referral,
  SCENARIOS,
  parseScenario,
  type Scenario,
} from "@/screens/a9-chat";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./a9.css";

const SUGGESTIONS: Readonly<Record<"client" | "team", readonly string[]>> = {
  client: [
    "Πώς κλείνω Γύρισμα;",
    "Πώς εγκρίνω ένα Παραδοτέο;",
    "Πού βλέπω τα Τιμολόγιά μου;",
  ],
  team: [
    "Τι ώρα πρέπει να είμαστε στο σετ;",
    "Ποιοι είναι οι κανόνες στο σετ;",
    "Τι λέμε όταν μας λένε ότι είναι ακριβό;",
  ],
};

export function A9({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const scenario = parseScenario(query.ask);
  const keep = { ask: query.ask };
  const header = (
    <StateSwitcher role={role} code="A9" state={state} keep={keep} />
  );
  if (role === "visitor") {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Ο Επισκέπτης ρωτά τον Βοηθό στην Ιστοσελίδα (δημόσιο widget, R12).
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τον Βοηθό" />
      </>
    );
  }
  return (
    <>
      {header}
      <Scenarios role={role} query={query} scenario={scenario} />
      <Panel role={role} scenario={scenario} isEmpty={state === "empty"} />
    </>
  );
}

interface ScenariosProps extends ScreenProps {
  scenario: Scenario;
}

function Scenarios({ role, query, scenario }: ScenariosProps) {
  return (
    <nav className="a9-scen" aria-label="Σενάρια">
      <span className="muted">Σενάρια:</span>
      {SCENARIOS.map((s) => (
        <Link
          key={s.id}
          href={screenHref(role, "A9", { ...query, ask: s.id })}
          aria-current={s.id === scenario}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}

interface PanelProps {
  role: RoleId;
  scenario: Scenario;
  isEmpty: boolean;
}

function Panel({ role, scenario, isEmpty }: PanelProps) {
  const isCapped = scenario === "capped" && !isEmpty;
  return (
    <section className="a9-panel" aria-label="Βοηθός">
      <div className="a9-head">
        <h2>Βοηθός</h2>
        <button type="button" className="button">
          Νέα Συζήτηση
        </button>
      </div>
      <p className="note">Απαντά στη γλώσσα σου, με πηγές.</p>
      <div className="a9-msgs">
        {isEmpty ? (
          <Welcome role={role} />
        ) : (
          <Messages role={role} scenario={scenario} />
        )}
      </div>
      {isCapped && <Capped role={role} />}
      <InputBar isDisabled={isCapped} />
      <p className="muted">
        Οι Συζητήσεις κρατιούνται 12 μήνες από το τελευταίο μήνυμα και τις
        βλέπει η εταιρεία.
      </p>
    </section>
  );
}

function Welcome({ role }: { role: RoleId }) {
  const list = SUGGESTIONS[role === "client" ? "client" : "team"];
  return (
    <>
      <div className="a9-a">
        <p>Γεια σου! Ρώτα με ό,τι θέλεις και θα σου απαντήσω με πηγές.</p>
      </div>
      <div className="a9-sugg">
        <span className="muted">Δοκίμασε:</span>
        {list.map((q) => (
          <button key={q} type="button" className="button">
            {q}
          </button>
        ))}
      </div>
    </>
  );
}

function Capped({ role }: { role: RoleId }) {
  return (
    <div className="a9-a" role="status">
      <p>Ο Βοηθός δεν είναι διαθέσιμος ως την 1η του μήνα.</p>
      {role === "client" ? (
        <Referral role={role} />
      ) : (
        <Link className="button" href={screenHref(role, "A8", {})}>
          Ψάξε στη Γνώση
        </Link>
      )}
      <p className="muted">
        Το δημόσιο widget σταματά νωρίτερα, στο{" "}
        {ASSISTANT_LIMITS.publicSharePercent}% του πλαφόν, ώστε οι Χρήστες να
        κρατούν το υπόλοιπο.
      </p>
    </div>
  );
}

function InputBar({ isDisabled }: { isDisabled: boolean }) {
  return (
    <div className="a9-input">
      <input
        className="input"
        type="text"
        aria-label="Ερώτηση"
        placeholder="Ρώτα κάτι…"
        maxLength={ASSISTANT_LIMITS.fixed.questionChars}
        disabled={isDisabled}
      />
      <button
        type="button"
        className="button"
        data-primary="true"
        disabled={isDisabled}
      >
        Στείλε
      </button>
      <span className="a9-count">0/{ASSISTANT_LIMITS.fixed.questionChars}</span>
    </div>
  );
}
