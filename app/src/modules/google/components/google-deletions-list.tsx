import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { formatDateTime } from "@/modules/filming";

import { resolveGoogleDeletion } from "../actions";
import type { GoogleDeletion } from "../types";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";
import { TextArea } from "./text-area";

// A7 «Διαγραφές από το Google»: Γυρίσματα που έφυγαν από το ημερολόγιο του Google και περιμένουν απόφαση.
export function GoogleDeletionsList({ items }: { items: GoogleDeletion[] }) {
  if (items.length === 0)
    return (
      <Notice kind="empty" title="Καμία διαγραφή σε εκκρεμότητα">
        <p className="m-0">Όταν κάποιο Γύρισμα διαγραφεί από το Google, θα εμφανιστεί εδώ μέχρι να αποφασίσεις.</p>
      </Notice>
    );
  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <DeletionCard key={item.filmingId} item={item} />
      ))}
    </div>
  );
}

function DeletionCard({ item }: { item: GoogleDeletion }) {
  return (
    <Panel label={item.title ?? "Γύρισμα"} aside={`Προθεσμία ${formatDateTime(item.deadlineAt)}`}>
      <div className="grid gap-4">
        <p className="m-0 text-sm text-muted-foreground">
          Έναρξη {formatDateTime(item.startsAt)}. Αν δεν αποφασίσεις ως την προθεσμία, το Γύρισμα ξαναγράφεται στο Google.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <ActionForm action={resolveGoogleDeletion} submitLabel="Επαναφορά" variant="default">
            <input type="hidden" name="filmingId" value={item.filmingId} />
            <input type="hidden" name="restore" value="on" />
            <MutedNote>Ξαναγράφει το Γύρισμα στο Google.</MutedNote>
          </ActionForm>
          <ActionForm action={resolveGoogleDeletion} submitLabel="Επιβεβαίωση ακύρωσης" variant="danger">
            <input type="hidden" name="filmingId" value={item.filmingId} />
            <TextArea name="reason" required placeholder="Λόγος ακύρωσης" />
            <MutedNote>Η ακύρωση θέλει λόγο.</MutedNote>
          </ActionForm>
        </div>
      </div>
    </Panel>
  );
}
