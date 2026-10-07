import Link from "next/link";

import { LANGUAGES, THEMES } from "@/data/profile";
import type { RoleId } from "@/data/roles";
import type { ProfileView } from "@/screens/a3-model";
import { Badge, screenHref, type ScreenQuery } from "@/screens/shared";

interface SectionProps {
  role: RoleId;
  query: ScreenQuery;
  profile: ProfileView;
  isEmpty: boolean;
}

const href = (
  role: RoleId,
  query: ScreenQuery,
  extra: Record<string, string | undefined>,
) =>
  screenHref(role, "A3", {
    state: query.state,
    lang: query.lang,
    theme: query.theme,
    ...extra,
  });

export function DetailsCard({ role, query, profile, isEmpty }: SectionProps) {
  const isEmailStep = query.email === "confirm";
  return (
    <section className="card o-card">
      <h2>Στοιχεία</h2>
      <div className="stack">
        <span className="stack">
          <label htmlFor="a3-name">Όνομα</label>
          <input
            id="a3-name"
            className="input a3-field"
            defaultValue={profile.name}
          />
        </span>
        <span className="stack">
          <span>Φωτογραφία</span>
          <span className="muted">
            {isEmpty ? "Δεν έχεις βάλει φωτογραφία." : "photo.jpg"}{" "}
            <button type="button" className="button">
              {isEmpty ? "Πρόσθεσε" : "Άλλαξε"}
            </button>
          </span>
        </span>
        {!profile.isClient && (
          <span className="stack">
            <label htmlFor="a3-phone">Τηλέφωνο</label>
            <input
              id="a3-phone"
              className="input a3-field"
              defaultValue={profile.extras.phone ?? ""}
            />
          </span>
        )}
        <span className="stack">
          <label htmlFor="a3-email">Email</label>
          <input
            id="a3-email"
            className="input a3-field"
            defaultValue={profile.email}
          />
          <span className="muted">
            Η αλλαγή θέλει επιβεβαίωση στη νέα διεύθυνση. Η παλιά παίρνει
            ειδοποίηση.
          </span>
        </span>
      </div>
      {isEmailStep && (
        <p className="note" role="status">
          Στείλαμε σύνδεσμο επιβεβαίωσης στη νέα διεύθυνση. Μέχρι να τον
          πατήσεις, ισχύει η παλιά.
        </p>
      )}
      <div className="btn-row">
        <Link
          className="button"
          data-primary="true"
          href={href(role, query, {
            email: isEmailStep ? undefined : "confirm",
          })}
        >
          Αποθήκευση
        </Link>
      </div>
    </section>
  );
}

export function LoginCard({ role, query, profile, isEmpty }: SectionProps) {
  const hasGoogle = profile.extras.hasGoogle && !isEmpty;
  const linked =
    query.google === "on" ? true : query.google === "off" ? false : hasGoogle;
  return (
    <section className="card o-card">
      <h2>Είσοδος</h2>
      <ul className="list">
        <li>
          Κωδικός{" "}
          <button type="button" className="button">
            Αλλαγή κωδικού
          </button>
        </li>
        <li>
          Σύνδεση Google{" "}
          <Badge>{linked ? "συνδεδεμένο" : "δεν είναι συνδεδεμένο"}</Badge>{" "}
          <Link
            className="button"
            href={href(role, query, { google: linked ? "off" : "on" })}
          >
            {linked ? "Αποσύνδεση Google" : "Σύνδεση Google"}
          </Link>
        </li>
        <li>
          <Link
            className="button"
            data-danger="true"
            href={href(role, query, { signout: "all" })}
          >
            Αποσύνδεση από όλες τις συσκευές
          </Link>
        </li>
      </ul>
      {query.signout === "all" && (
        <p className="note" role="status">
          Θα αποσυνδεθείς από όλες τις συσκευές, και από αυτή. Θα ξαναμπείς με
          τον κωδικό σου.
        </p>
      )}
    </section>
  );
}

export function PreferencesCard({ role, query }: SectionProps) {
  const lang = query.lang === "en" ? "en" : "el";
  const theme = THEMES.find((t) => t.id === query.theme)?.id ?? "dark";
  return (
    <section className="card o-card">
      <h2>Γλώσσα και θέμα</h2>
      <h3>Γλώσσα</h3>
      <div className="a3-choice">
        {LANGUAGES.map((item) => (
          <Link
            key={item.id}
            className="button"
            aria-current={item.id === lang}
            href={href(role, query, {
              lang: item.id === "el" ? undefined : item.id,
            })}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <p className="muted">Ισχύει και για τα emails που παίρνεις.</p>
      <h3>Θέμα</h3>
      <div className="a3-choice">
        {THEMES.map((item) => (
          <Link
            key={item.id}
            className="button"
            aria-current={item.id === theme}
            href={href(role, query, {
              theme: item.id === "dark" ? undefined : item.id,
            })}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
