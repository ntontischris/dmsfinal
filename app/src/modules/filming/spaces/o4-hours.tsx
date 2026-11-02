import {
  ActionButton,
  SaveRow,
  SettingsCard,
  SettingsForm,
} from "@/modules/settings";
import { DateLead, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import {
  deleteBookingException,
  saveBookingException,
  saveBookingHours,
} from "../actions-booking";
import { BOOKING_DAY_LABELS, STEP_LABELS } from "../booking-labels";
import type { BookingException, BookingHoursView } from "../booking-types";
import { formatHours } from "../helpers-time";
import { BOOKING_DURATION_CHOICES, STEP_CHOICES } from "../schemas-booking";
import { PROPOSAL_WEEK, exceptionState } from "./o4-model";

const WEEKDAY = new Intl.DateTimeFormat("el-GR", { weekday: "short" });
// Η μέρα ως «Πεμ 25» στην αρχή της γραμμής (και στις Αργίες).
export const dateLeadOf = (day: string) => (
  <DateLead
    weekday={WEEKDAY.format(new Date(`${day}T12:00:00`))}
    day={day.slice(8, 10)}
  />
);

// Ωράριο κρατήσεων, Χωρητικότητα, διάρκειες και βήμα (prototype `screens/o4-hours.tsx`), με το πραγματικό saveBookingHours.
// Όσο δεν έχει αποθηκευτεί τίποτα, η φόρμα ανοίγει με την πρόταση και ο πελάτης δεν κλείνει.
function HoursForm({ view }: { view: BookingHoursView }) {
  const week = view.isSet ? view.week : PROPOSAL_WEEK;
  const durations = view.isSet ? view.durations : [2, 3, 4];
  return (
    <SettingsForm action={saveBookingHours}>
      <SettingsCard title="Εβδομαδιαίο πρόγραμμα">
        {!view.isSet && (
          <p className="note" role="status">
            Το Ωράριο δεν έχει αποθηκευτεί: οι πελάτες δεν μπορούν να κλείσουν
            μέχρι να το αποθηκεύσεις.
          </p>
        )}
        <RowList>
          {week.map((day) => (
            <ListRow
              key={day.dow}
              title={BOOKING_DAY_LABELS[day.dow]}
              aside={
                <>
                  <select
                    name={`open-${day.dow}`}
                    className="select"
                    aria-label={`${BOOKING_DAY_LABELS[day.dow]}: ανοιχτά ή κλειστά`}
                    defaultValue={day.isOpen ? "on" : ""}
                  >
                    <option value="on">ανοιχτά</option>
                    <option value="">κλειστά</option>
                  </select>
                  <input
                    className="input"
                    type="time"
                    name={`from-${day.dow}`}
                    aria-label={`${BOOKING_DAY_LABELS[day.dow]}, από`}
                    defaultValue={day.opens ?? ""}
                  />
                  <input
                    className="input"
                    type="time"
                    name={`to-${day.dow}`}
                    aria-label={`${BOOKING_DAY_LABELS[day.dow]}, έως`}
                    defaultValue={day.closes ?? ""}
                  />
                </>
              }
            />
          ))}
        </RowList>
        <div className="o-fields">
          <span className="stack o-field">
            <label htmlFor="o4-capacity">Χωρητικότητα</label>
            <input
              id="o4-capacity"
              name="capacity"
              className="input"
              type="number"
              min={1}
              max={20}
              required
              defaultValue={view.isSet ? view.capacity : 2}
            />
          </span>
        </div>
        <p className="muted o-hint">
          Χωρητικότητα: πόσα Γυρίσματα χωράνε ταυτόχρονα (1 έως 20). Ανά μέρα
          αλλάζει με μια εξαίρεση.
        </p>
      </SettingsCard>
      <SettingsCard title="Διάρκειες και ώρα έναρξης">
        <div className="o-fields">
          <fieldset className="stack o-field">
            <legend>Επιτρεπτές διάρκειες</legend>
            <span className="btn-row">
              {BOOKING_DURATION_CHOICES.map((hours) => (
                <label key={hours}>
                  <input
                    type="checkbox"
                    name="durations"
                    value={hours}
                    defaultChecked={durations.includes(hours)}
                  />{" "}
                  {formatHours(hours)} ώρ.
                </label>
              ))}
            </span>
          </fieldset>
          <span className="stack o-field">
            <label htmlFor="o4-step">Βήμα ώρας έναρξης</label>
            <select
              id="o4-step"
              name="stepMinutes"
              className="select"
              defaultValue={view.isSet ? view.stepMinutes : 60}
            >
              {STEP_CHOICES.map((minutes) => (
                <option key={minutes} value={minutes}>
                  {STEP_LABELS[minutes]}
                </option>
              ))}
            </select>
          </span>
        </div>
        <p className="muted o-hint">
          Ο πελάτης διαλέγει μόνο από αυτές· η ομάδα μπορεί ελεύθερα από 0,5 έως
          12 ώρες.
        </p>
        <SaveRow card="hours" isAlwaysEnabled={!view.isSet} />
      </SettingsCard>
    </SettingsForm>
  );
}

function NewException() {
  return (
    <details>
      <summary className="button">+ Νέα εξαίρεση</summary>
      <SettingsForm action={saveBookingException} resetOnSuccess>
        <div className="o-fields">
          <span className="stack o-field">
            <label htmlFor="o4-ex-day">Μέρα</label>
            <input
              id="o4-ex-day"
              name="day"
              className="input"
              type="date"
              required
            />
          </span>
          <span className="stack o-field">
            <label htmlFor="o4-ex-mode">Τι ισχύει</label>
            <select
              id="o4-ex-mode"
              name="mode"
              className="select"
              defaultValue="closed"
            >
              <option value="closed">Κλειστή</option>
              <option value="hours">Άλλες ώρες</option>
            </select>
          </span>
          <span className="stack o-field">
            <label htmlFor="o4-ex-from">Από (μόνο για άλλες ώρες)</label>
            <input id="o4-ex-from" name="opens" className="input" type="time" />
          </span>
          <span className="stack o-field">
            <label htmlFor="o4-ex-to">Έως (μόνο για άλλες ώρες)</label>
            <input id="o4-ex-to" name="closes" className="input" type="time" />
          </span>
          <span className="stack o-field">
            <label htmlFor="o4-ex-cap">Χωρητικότητα (προαιρετική)</label>
            <input
              id="o4-ex-cap"
              name="capacity"
              className="input"
              type="number"
              min={1}
              max={20}
            />
          </span>
          <span className="stack o-field">
            <label htmlFor="o4-ex-note">Σημείωση</label>
            <textarea
              id="o4-ex-note"
              name="note"
              className="input"
              rows={2}
              maxLength={500}
            />
          </span>
        </div>
        <SaveRow card="exception" label="Προσθήκη εξαίρεσης" isAlwaysEnabled />
      </SettingsForm>
    </details>
  );
}

function Exceptions({
  exceptions,
}: {
  exceptions: readonly BookingException[];
}) {
  return (
    <SettingsCard title="Εξαιρέσεις ανά μέρα">
      {exceptions.length === 0 ? (
        <p className="muted o-hint">
          Οι εξαιρέσεις ημερών (κλειστές ή με άλλες ώρες) εμφανίζονται εδώ.
        </p>
      ) : (
        <RowList>
          {exceptions.map((ex) => (
            <ListRow
              key={ex.day}
              lead={dateLeadOf(ex.day)}
              title={ex.note ? `«${ex.note}»` : fmtDate(ex.day)}
              sub={fmtDate(ex.day)}
              aside={
                <>
                  <Badge>{exceptionState(ex)}</Badge>
                  <ActionButton
                    action={deleteBookingException}
                    fields={{ day: ex.day }}
                    label="Διαγραφή"
                    isDanger
                  />
                </>
              }
            />
          ))}
        </RowList>
      )}
      <div className="btn-row o-list-actions">
        <NewException />
      </div>
    </SettingsCard>
  );
}

export function O4Hours({ view }: { view: BookingHoursView }) {
  return (
    <>
      <HoursForm view={view} />
      <Exceptions exceptions={view.exceptions} />
    </>
  );
}

