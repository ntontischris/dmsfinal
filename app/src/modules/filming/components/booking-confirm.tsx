import { Field, Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";

import { bookClientFilming, rescheduleClientFilming } from "../actions-book";
import type { BookingSelection } from "../booking-links";
import type { BookingPlan } from "../booking-plan";
import { athensToIso, formatDateTime, formatHours } from "../helpers-time";
import { ActionForm } from "./action-form";
import { MutedNote, TextArea } from "./form-fields";

// Σύνοψη και επιβεβαίωση. Η κράτηση δίνει Όριο ακύρωσης (ώρα έναρξης − ώρες της Συμφωνίας)· η μετάθεση δεν έχει πεδία κειμένου.
export function BookingConfirm({
  plan,
  selection,
  time,
}: {
  plan: BookingPlan;
  selection: BookingSelection;
  time: string;
}) {
  const startsAt = athensToIso(selection.day ?? "", time);
  const isReschedule = selection.reschedule !== undefined;
  const hours = String(plan.hours ?? "");
  return (
    <Panel label={isReschedule ? "Μετάθεση" : "Σύνοψη"}>
      <div className="grid gap-4">
        <dl className="m-0 grid gap-1 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
          <dt className="text-muted-foreground">Ώρα</dt>
          <dd className="m-0">{formatDateTime(startsAt)}</dd>
          <dt className="text-muted-foreground">Διάρκεια</dt>
          <dd className="m-0">{formatHours(plan.hours ?? 0)} ώρες</dd>
          {!isReschedule && (
            <>
              <dt className="text-muted-foreground">Είδος</dt>
              <dd className="m-0">{plan.kind.label}</dd>
              <dt className="text-muted-foreground">Όριο ακύρωσης</dt>
              <dd className="m-0">
                {formatDateTime(new Date(new Date(startsAt).getTime() - plan.agreement.cancelHours * 3_600_000).toISOString())}
              </dd>
            </>
          )}
        </dl>
        {isReschedule ? (
          <ActionForm action={rescheduleClientFilming} submitLabel="Επιβεβαίωση μετάθεσης" variant="primary">
            <input type="hidden" name="filmingId" value={selection.reschedule} />
            <input type="hidden" name="date" value={selection.day} />
            <input type="hidden" name="time" value={time} />
            <input type="hidden" name="hours" value={hours} />
          </ActionForm>
        ) : (
          <ActionForm action={bookClientFilming} submitLabel="Επιβεβαίωση" variant="primary">
            <input type="hidden" name="agreementId" value={plan.agreement.id} />
            <input type="hidden" name="kindId" value={plan.kind.id} />
            <input type="hidden" name="date" value={selection.day} />
            <input type="hidden" name="time" value={time} />
            <input type="hidden" name="hours" value={hours} />
            <Field label="Πού γυρίζεται" hint="Προαιρετικό. Π.χ. το στούντιο ή η διεύθυνση.">
              <Input name="location" maxLength={200} />
            </Field>
            <Field label="Σημείωση για την ομάδα">
              <TextArea name="note" maxLength={500} />
            </Field>
            <MutedNote>Η κράτηση μπορεί να περιμένει έγκριση της ομάδας, ανάλογα με τη Συμφωνία σου.</MutedNote>
          </ActionForm>
        )}
      </div>
    </Panel>
  );
}
