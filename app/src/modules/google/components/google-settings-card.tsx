import { ActionForm } from "./action-form";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/field";
import { MutedNote } from "./form-fields";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";

import { createGoogleCalendar, runGoogleSyncNow } from "../actions-setup";
import { resyncGoogle } from "../actions";
import { ageLabel, pendingLabel } from "../helpers";
import type { GoogleView } from "../types";

interface GoogleSettingsCardProps {
  configured: boolean;
  view: GoogleView | null;
  ownerEmail: string;
}

// Ρυθμίσεις › Ενσωματώσεις: η σύνδεση με το Google. Χωρίς στοιχεία λογαριασμού, μόνο το Notice.
export function GoogleSettingsCard({ configured, view, ownerEmail }: GoogleSettingsCardProps) {
  return (
    <Panel
      label="Google Calendar"
      aside={<Badge tone={view?.connected ? "ok" : undefined}>{view?.connected ? "Συνδεδεμένο" : "Δεν έχει δημιουργηθεί"}</Badge>}
    >
      {!configured ? (
        <Notice kind="error" title="Λείπουν τα στοιχεία του λογαριασμού Google στο Vercel" />
      ) : view === null ? (
        <p className="m-0 text-sm text-destructive">Η κατάσταση του Google δεν φόρτωσε. Δοκίμασε ξανά.</p>
      ) : view.connected ? (
        <ConnectedBody view={view} />
      ) : (
        <CreateCalendarForm ownerEmail={ownerEmail} />
      )}
    </Panel>
  );
}

function CreateCalendarForm({ ownerEmail }: { ownerEmail: string }) {
  return (
    <div className="grid gap-3">
      <MutedNote>
        Φτιάχνει ξεχωριστό ημερολόγιο «Devre Media · Γυρίσματα» και το μοιράζει σε αυτό το email (με δικαίωμα επεξεργασίας).
      </MutedNote>
      <ActionForm action={createGoogleCalendar} submitLabel="Δημιουργία ημερολογίου" variant="primary">
        <Field label="Email για κοινοποίηση">
          <Input name="sharedWith" type="email" required defaultValue={ownerEmail} autoComplete="off" />
        </Field>
      </ActionForm>
    </div>
  );
}

function ConnectedBody({ view }: { view: GoogleView }) {
  return (
    <div className="grid gap-3 text-sm">
      <p className="m-0">Συνδεδεμένο, μοιρασμένο με {view.sharedWith ?? "—"}.</p>
      <p className="m-0 text-muted-foreground">
        Τελευταίος συγχρονισμός: {ageLabel(view.lastSyncAt)} · {pendingLabel(view.pendingWrites)}
      </p>
      {view.lastError && (
        <p role="alert" className="m-0 text-destructive">
          Τελευταίο σφάλμα: {view.lastError}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <ActionForm action={runGoogleSyncNow} submitLabel="Συγχρονισμός τώρα" variant="default">
          <MutedNote>Τρέχει τώρα την ουρά και τον συγχρονισμό από το Google.</MutedNote>
        </ActionForm>
        <ActionForm action={resyncGoogle} submitLabel="Ξαναγράψε όλα" variant="default">
          <MutedNote>Βάζει στην ουρά όλα τα Γυρίσματα και τον Κλεισμένο χρόνο της ομάδας.</MutedNote>
        </ActionForm>
      </div>
    </div>
  );
}
