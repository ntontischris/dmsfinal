import Link from "next/link";

import {
  CALENDAR_CONTENT,
  NEW_CALENDAR_TOKEN,
  calendarUrl,
} from "@/data/profile";
import type { RoleId } from "@/data/roles";
import type { ProfileView } from "@/screens/a3-model";
import { screenHref, type ScreenQuery } from "@/screens/shared";

interface CalendarProps {
  role: RoleId;
  query: ScreenQuery;
  profile: ProfileView;
}

export function CalendarCard({ role, query, profile }: CalendarProps) {
  const renewal = query.renew;
  const token =
    renewal === "done" ? NEW_CALENDAR_TOKEN : profile.extras.calendarToken;
  const href = (renew?: string) =>
    screenHref(role, "A3", {
      state: query.state,
      lang: query.lang,
      theme: query.theme,
      renew,
    });
  return (
    <section className="card o-card">
      <h2>Σύνδεσμος ημερολογίου</h2>
      <p className="muted">
        {profile.isClient ? CALENDAR_CONTENT.client : CALENDAR_CONTENT.team}
      </p>
      <code className="a3-url">{calendarUrl(token)}</code>
      <div className="btn-row">
        <button type="button" className="button">
          Αντιγραφή
        </button>
        <Link className="button" href={href("confirm")}>
          Ανανέωση
        </Link>
      </div>
      {renewal === "confirm" && (
        <div className="note" role="status">
          <p>
            Ο παλιός σύνδεσμος σταματά αμέσως. Όπου τον έχεις βάλει (Google,
            iPhone), θα πρέπει να βάλεις τον νέο.
          </p>
          <div className="btn-row">
            <Link className="button" data-danger="true" href={href("done")}>
              Επιβεβαίωση ανανέωσης
            </Link>
            <Link className="button" href={href()}>
              Άκυρο
            </Link>
          </div>
        </div>
      )}
      {renewal === "done" && (
        <p className="note" role="status">
          Ο σύνδεσμος ανανεώθηκε. Ο παλιός σταμάτησε.
        </p>
      )}
      <h3>Οδηγίες</h3>
      <p>
        <strong>Google Calendar:</strong>
      </p>
      <ol className="a3-steps">
        <li>Άνοιξε το Google Calendar στον υπολογιστή.</li>
        <li>Άλλα ημερολόγια, «+», «Από URL».</li>
        <li>Επικόλλησε τη διεύθυνση και πάτα «Προσθήκη».</li>
      </ol>
      <p>
        <strong>iPhone:</strong>
      </p>
      <ol className="a3-steps">
        <li>Ρυθμίσεις, Ημερολόγιο, Λογαριασμοί.</li>
        <li>Προσθήκη λογαριασμού, Άλλο, «Προσθήκη συνδρομητού ημερολογίου».</li>
        <li>Επικόλλησε τη διεύθυνση και πάτα «Επόμενο».</li>
      </ol>
    </section>
  );
}

export function RolesCard({ profile }: { profile: ProfileView }) {
  return (
    <section className="card o-card">
      <h2>Οι Ρόλοι μου</h2>
      <p>{profile.roleLabel}</p>
      <p className="muted">
        Τους Ρόλους δεν τους αλλάζεις εσύ. Αν θες αλλαγή, ζήτησέ την από τη
        Διαχείριση.
      </p>
    </section>
  );
}
