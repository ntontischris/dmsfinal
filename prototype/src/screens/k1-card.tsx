import type { AppEvent, Automation } from "@/data/notifications";
import {
  goesToClient,
  hasMissingEnglish,
  recipientText,
  timingText,
} from "@/screens/k1-model";
import { Badge } from "@/screens/shared";

import "./k1.css";

const UNITS = ["λεπτά", "ώρες", "μέρες"] as const;

function WaitField({ automation }: { automation: Automation }) {
  const t = automation.timing;
  if (t.kind !== "αναμονή") return null;
  return (
    <div className="k1-wait">
      <label htmlFor={`${automation.id}-x`}>Χ (αναμονή)</label>
      <input
        id={`${automation.id}-x`}
        className="input"
        type="number"
        min={1}
        defaultValue={t.after}
      />
      <select className="input" defaultValue={t.unit} aria-label="Μονάδα">
        {UNITS.map((u) => (
          <option key={u}>{u}</option>
        ))}
      </select>
    </div>
  );
}

function Recipients({ automation, event }: CardProps) {
  return (
    <>
      <dt>Παραλήπτες</dt>
      <dd>
        {automation.recipients.map(recipientText).join(", ")}
        {event.isCostOnly && (
          <span className="muted">
            {" "}
            · κλειδωμένοι: μόνο όσοι βλέπουν κόστος
          </span>
        )}
      </dd>
    </>
  );
}

function TextFields({
  automation,
  hasError,
}: {
  automation: Automation;
  hasError: boolean;
}) {
  const id = automation.id;
  return (
    <>
      {automation.subject && (
        <>
          <label htmlFor={`${id}-subject`}>Θέμα (email), ελληνικά</label>
          <input
            id={`${id}-subject`}
            className="input"
            style={{ width: "100%" }}
            defaultValue={automation.subject.el}
          />
          <label htmlFor={`${id}-subject-en`}>Θέμα (email), αγγλικά</label>
          <input
            id={`${id}-subject-en`}
            className="input"
            style={{ width: "100%" }}
            defaultValue={automation.subject.en}
          />
        </>
      )}
      <div className="compare">
        <div>
          <label htmlFor={`${id}-el`}>Κείμενο, ελληνικά</label>
          <textarea
            id={`${id}-el`}
            className={hasError ? "input k1-field-error" : "input"}
            defaultValue={automation.text.el}
          />
          {hasError && (
            <p className="k1-error" role="alert">
              Άγνωστη μεταβλητή {"{τοποθεσια}"}: διάλεξε από τη λίστα.
            </p>
          )}
        </div>
        <div>
          <label htmlFor={`${id}-en`}>Κείμενο, αγγλικά</label>
          <textarea
            id={`${id}-en`}
            className="input"
            defaultValue={automation.text.en}
          />
        </div>
      </div>
    </>
  );
}

interface CardProps {
  automation: Automation;
  event: AppEvent;
}

interface AutomationCardProps extends CardProps {
  hasError: boolean;
}

export function AutomationCard({
  automation,
  event,
  hasError,
}: AutomationCardProps) {
  const toClient = goesToClient(automation);
  return (
    <section className="card k1-auto">
      <div className="card-title">
        <h2>
          {automation.channel}
          {automation.isInitial
            ? " · αρχικός"
            : " · προστέθηκε από τη Διαχείριση"}
        </h2>
        <label className="k1-switch">
          <input type="checkbox" defaultChecked={automation.isActive} />
          Ενεργός
        </label>
      </div>
      <div className="k1-meta" style={{ marginBottom: "var(--space-2)" }}>
        {toClient && automation.isEssential && (
          <Badge tone="strong">απαραίτητο</Badge>
        )}
        {hasMissingEnglish(automation) && (
          <Badge tone="attention">χωρίς αγγλικό</Badge>
        )}
      </div>
      <dl className="dl">
        <Recipients automation={automation} event={event} />
        <dt>Πότε</dt>
        <dd>{timingText(automation.timing)}</dd>
        {toClient && (
          <>
            <dt>Απαραίτητο</dt>
            <dd>
              <label className="k1-switch">
                <input
                  type="checkbox"
                  defaultChecked={!!automation.isEssential}
                />
                Ο πελάτης δεν μπορεί να το σβήσει
              </label>
            </dd>
          </>
        )}
      </dl>
      <WaitField automation={automation} />
      <TextFields automation={automation} hasError={hasError} />
      <div className="btn-row" style={{ marginTop: "var(--space-3)" }}>
        <button className="button" data-primary="true" type="button">
          Αποθήκευση
        </button>
        <button className="button" type="button">
          Δοκιμαστική αποστολή σε μένα
        </button>
        {!automation.isInitial && (
          <button className="button" data-danger="true" type="button">
            Διαγραφή
          </button>
        )}
      </div>
      {automation.isInitial && (
        <p className="note">
          Οι αρχικοί Αυτοματισμοί δεν διαγράφονται, μόνο σβήνουν. Η δοκιμή
          στέλνει σε εσένα με φανταστικές τιμές και γράφεται στο Ιστορικό ως
          «δοκιμή».
        </p>
      )}
    </section>
  );
}
