import {
  ageLabel,
  createGoogleCalendar,
  pendingLabel,
  resyncGoogle,
  runGoogleSyncNow,
  type GoogleView,
} from "@/modules/google";

import { N5Form } from "./n5-forms";

// Η ρύθμιση του Google ημερολογίου μέσα στην κάρτα «Google ημερολόγιο» της N5, στη μορφή του κουτιού (`.ml-actions`, `.note`).
// Ίδιες ενέργειες με την κλασική κάρτα (createGoogleCalendar, runGoogleSyncNow, resyncGoogle).

interface GoogleSetupProps {
  configured: boolean;
  view: GoogleView | null;
  ownerEmail: string;
}

function CreateCalendar({ ownerEmail }: { ownerEmail: string }) {
  return (
    <N5Form
      action={createGoogleCalendar}
      submitLabel="Δημιουργία ημερολογίου"
      pendingLabel="Δημιουργία…"
      isPrimary
      className="ml-fields"
    >
      <p className="muted ml-field" data-wide>
        Φτιάχνει ξεχωριστό ημερολόγιο «Devre Media · Γυρίσματα» και το μοιράζει
        σε αυτό το email (με δικαίωμα επεξεργασίας).
      </p>
      <span className="ml-field">
        <label htmlFor="n5-google-shared">Email για κοινοποίηση</label>
        <input
          id="n5-google-shared"
          name="sharedWith"
          type="email"
          className="input"
          required
          defaultValue={ownerEmail}
          autoComplete="off"
        />
      </span>
    </N5Form>
  );
}

function Connected({ view }: { view: GoogleView }) {
  return (
    <>
      <dl className="ml-kv">
        <dt>Μοιρασμένο με</dt>
        <dd>{view.sharedWith ?? "—"}</dd>
        <dt>Τελευταίος συγχρονισμός</dt>
        <dd>{ageLabel(view.lastSyncAt)}</dd>
        <dt>Ουρά</dt>
        <dd>{pendingLabel(view.pendingWrites)}</dd>
      </dl>
      {view.lastError && (
        <p className="note n5-warning" role="alert">
          Τελευταίο σφάλμα: {view.lastError}
        </p>
      )}
      <N5Form
        action={runGoogleSyncNow}
        submitLabel="Συγχρονισμός τώρα"
        pendingLabel="Συγχρονισμός…"
      >
        <p className="muted">
          Τρέχει τώρα την ουρά και τον συγχρονισμό από το Google.
        </p>
      </N5Form>
      <N5Form
        action={resyncGoogle}
        submitLabel="Ξαναγράψε όλα"
        pendingLabel="Περιμένε…"
      >
        <p className="muted">
          Βάζει στην ουρά όλα τα Γυρίσματα και τον Κλεισμένο χρόνο της ομάδας.
        </p>
      </N5Form>
    </>
  );
}

export function GoogleSetup({
  configured,
  view,
  ownerEmail,
}: GoogleSetupProps) {
  if (!configured)
    return (
      <p className="note n5-warning" role="alert">
        Λείπουν τα στοιχεία του λογαριασμού Google στο Vercel.
      </p>
    );
  if (view === null)
    return (
      <p className="note n5-warning" role="alert">
        Η κατάσταση του Google δεν φόρτωσε. Δοκίμασε ξανά.
      </p>
    );
  return view.connected ? (
    <Connected view={view} />
  ) : (
    <CreateCalendar ownerEmail={ownerEmail} />
  );
}
