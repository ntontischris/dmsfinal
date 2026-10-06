import Link from "next/link";

import type { SystemMessage } from "@/data/notifications";
import type { RoleId } from "@/data/roles";
import { fillVariables, stripVariable, whenEdited } from "@/screens/k2-model";
import { Badge, screenHref } from "@/screens/shared";

import "./k2.css";

interface EditorProps {
  role: RoleId;
  message: SystemMessage;
  isInvalid: boolean;
}

function Variables({ message }: { message: SystemMessage }) {
  return (
    <ul className="k2-vars">
      {message.variables.map((v) => {
        const isRequired = message.requiredVariables.includes(v);
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

function Preview({ message }: { message: SystemMessage }) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>Προεπισκόπηση</h2>
        <span className="muted">με φανταστικές τιμές</span>
      </div>
      <div className="compare">
        <div>
          <h3>Ελληνικά</h3>
          <p>
            <strong>{fillVariables(message.subject.el)}</strong>
          </p>
          <pre className="k2-preview">{fillVariables(message.text.el)}</pre>
        </div>
        <div>
          <h3>English</h3>
          {message.text.en ? (
            <>
              <p>
                <strong>{fillVariables(message.subject.en)}</strong>
              </p>
              <pre className="k2-preview">{fillVariables(message.text.en)}</pre>
            </>
          ) : (
            <p className="muted">Χωρίς αγγλικό: φεύγει το ελληνικό.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Fields({ message, isInvalid }: Omit<EditorProps, "role">) {
  const required = message.requiredVariables[0];
  const textEl = isInvalid
    ? stripVariable(message.text.el, required)
    : message.text.el;
  return (
    <form className="k2-form">
      <div className="k2-field">
        <label htmlFor="subj-el">Θέμα (ελληνικά)</label>
        <input
          id="subj-el"
          className="input"
          defaultValue={message.subject.el}
        />
      </div>
      <div className="k2-field">
        <label htmlFor="text-el">Κείμενο (ελληνικά)</label>
        <textarea id="text-el" className="input" defaultValue={textEl} />
        {isInvalid && (
          <p className="k2-error" role="alert">
            Λείπει το {`{${required}}`}: πρόσθεσέ το για να αποθηκευτεί.
          </p>
        )}
      </div>
      <div className="k2-field">
        <label htmlFor="subj-en">Θέμα (English)</label>
        <input
          id="subj-en"
          className="input"
          defaultValue={message.subject.en}
        />
      </div>
      <div className="k2-field">
        <label htmlFor="text-en">Κείμενο (English)</label>
        <textarea
          id="text-en"
          className="input"
          defaultValue={message.text.en}
        />
        {!message.text.en && <Badge tone="attention">χωρίς αγγλικό</Badge>}
      </div>
      <div className="btn-row">
        <button type="button" className="button" data-primary="true">
          Αποθήκευση
        </button>
        <button type="button" className="button">
          Δοκιμαστική αποστολή σε μένα
        </button>
        {message.isEdited && (
          <button type="button" className="button" data-danger="true">
            Επαναφορά αρχικού κειμένου
          </button>
        )}
      </div>
    </form>
  );
}

export function MessageEditor({ role, message, isInvalid }: EditorProps) {
  const required = message.requiredVariables[0];
  return (
    <>
      <p>
        <Link href={screenHref(role, "K2", {})}>
          ← Όλα τα Μηνύματα συστήματος
        </Link>
      </p>
      <section className="card">
        <div className="card-title">
          <h2>{message.title}</h2>
          <span className="k2-meta">
            <Badge>πάντα ενεργό</Badge>
            {message.isEdited && <Badge tone="strong">αλλαγμένο κείμενο</Badge>}
          </span>
        </div>
        <p className="muted">{message.when}</p>
        <p className="muted">{message.note}</p>
        {message.isEdited && (
          <p className="muted">Αλλαγή από: {whenEdited(message)}</p>
        )}
        <p className="note">
          Δεν υπάρχει διακόπτης: αυτό το μήνυμα είναι απαραίτητο για να δουλέψει
          το σύστημα (είσοδος, υπογραφή, πρόσκληση). Αλλάζεις μόνο το κείμενο.
        </p>
        <h3>Μεταβλητές</h3>
        <Variables message={message} />
        <p className="note">
          Χωρίς τον {`{${required}}`} η λειτουργία σπάει· το κείμενο δεν
          αποθηκεύεται αν λείπει.
        </p>
        <Fields message={message} isInvalid={isInvalid} />
      </section>
      <Preview message={message} />
      <p className="note">
        Η δοκιμή στέλνει στον ίδιο τον admin με φανταστικές τιμές και γράφεται
        στο Ιστορικό ως «δοκιμή». Κάθε αλλαγή γράφεται στο Ίχνος ενεργειών
        (ποιος, πότε, τι).
      </p>
    </>
  );
}
