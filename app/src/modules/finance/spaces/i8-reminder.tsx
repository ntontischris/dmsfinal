import { fmtDate } from "@/spaces/screens/shared";

import { REMINDER_ANCHOR } from "../invoice-detail-helpers";
import type { ReminderPreview } from "../invoice-reminder-schema";
import { getReminderPreview } from "../invoices-queries";
import { athensToday } from "../money";
import { SendReminderForm } from "./i8-reminder-send";

// Τ4: «Στείλε υπενθύμιση» στη σελίδα ληξιπρόθεσμου Τιμολογίου. Δύο βήματα: (1) το email όπως θα φύγει στην επαφή
// πληρωμών του Πελάτη, από το μήνυμα «Ληξιπρόθεσμο» των Αυτοματισμών, (2) «Στείλε υπενθύμιση».

const recipientsText = (preview: ReminderPreview): string =>
  preview.recipients.map((r) => `${r.name} (${r.email})`).join(", ");

const ATHENS_TIME = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Γιατί δεν φεύγει υπενθύμιση τώρα, ή null όταν μπορεί να φύγει. Η βάση κάνει τους ίδιους ελέγχους στην αποστολή.
const blockedText = (preview: ReminderPreview): string | null => {
  if (!preview.isEnabled)
    return "Ο Αυτοματισμός «Ληξιπρόθεσμο» είναι κλειστός. Άνοιξέ τον από τους Αυτοματισμούς για να στέλνονται υπενθυμίσεις.";
  if (preview.recentAt)
    return `Στάλθηκε υπενθύμιση πριν από λίγο (στις ${ATHENS_TIME.format(new Date(preview.recentAt))}). Ξαναδοκίμασε αύριο.`;
  if (preview.recipients.length === 0)
    return "Ο Πελάτης δεν έχει επαφή με email για τα Οικονομικά. Πρόσθεσε έναν Χρήστη πελάτη για να στέλνονται υπενθυμίσεις.";
  return null;
};

function Preview({ preview, invoiceId }: { preview: ReminderPreview; invoiceId: string }) {
  const blocked = blockedText(preview);
  if (blocked) return <p className="muted">{blocked}</p>;
  return (
    <>
      <p className="muted">1. Αυτό θα φύγει</p>
      <p>
        <strong>Προς:</strong> {recipientsText(preview)}
        <br />
        <strong>Θέμα:</strong> {preview.subject}
      </p>
      <p className="ml-reminder-body">{preview.body}</p>
      <p className="muted">
        2. Στείλ’ το
        {preview.lastAt ? ` · η τελευταία έφυγε ${fmtDate(athensToday(new Date(preview.lastAt)))}` : ""}
      </p>
      <SendReminderForm invoiceId={invoiceId} />
    </>
  );
}

export async function ReminderBox({ invoiceId, isOpen }: { invoiceId: string; isOpen: boolean }) {
  const preview = await getReminderPreview(invoiceId);
  return (
    <section id={REMINDER_ANCHOR}>
      <details className="ml-box" open={isOpen}>
        <summary>
          <h2 className="ml-box-title">Στείλε υπενθύμιση</h2>
          <small>email στον Πελάτη για το ληξιπρόθεσμο</small>
        </summary>
        <div>
          {preview.ok ? (
            <Preview preview={preview.data} invoiceId={invoiceId} />
          ) : (
            <p className="muted">Η υπενθύμιση δεν φόρτωσε. Δοκίμασε ξανά.</p>
          )}
        </div>
      </details>
    </section>
  );
}
