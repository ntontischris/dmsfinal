import { Field, Input, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";

import { saveBookingHours } from "../actions-booking";
import { BOOKING_DURATION_CHOICES, STEP_CHOICES } from "../schemas-booking";
import { BOOKING_DAY_LABELS, STEP_LABELS } from "../booking-labels";
import type { BookingHoursView, BookingWeekDay } from "../booking-types";
import { formatHours } from "../helpers-time";

import { ActionForm } from "./action-form";
import { MutedNote } from "./form-fields";

// Ρυθμίσεις › Γυρίσματα: εβδομαδιαίο Ωράριο, Χωρητικότητα, διάρκειες και βήμα ώρας.
// Όσο δεν έχει αποθηκευτεί τίποτα, η φόρμα ανοίγει με την πρόταση και ο πελάτης δεν κλείνει.

const PROPOSAL_WEEK: BookingWeekDay[] = [1, 2, 3, 4, 5, 6, 7].map((dow) => ({
  dow,
  isOpen: dow !== 7,
  opens: dow === 6 ? "10:00" : "09:00",
  closes: dow === 6 ? "15:00" : "19:00",
}));

export function BookingHoursForm({ view }: { view: BookingHoursView }) {
  const week = view.isSet ? view.week : PROPOSAL_WEEK;
  const capacity = view.isSet ? view.capacity : 2;
  const durations = view.isSet ? view.durations : [2, 3, 4];
  const step = view.isSet ? view.stepMinutes : 60;
  return (
    <Panel label="Ωράριο και Χωρητικότητα">
      <div className="grid gap-5">
        {!view.isSet && (
          <Notice kind="empty" title="Το Ωράριο δεν έχει αποθηκευτεί">
            <p className="m-0">Οι πελάτες δεν μπορούν να κλείσουν μέχρι να το αποθηκεύσεις.</p>
          </Notice>
        )}
        <ActionForm action={saveBookingHours} onlyWhenChanged={view.isSet} submitLabel="Αποθήκευση Ωραρίου" variant="primary">
          <div className="grid gap-2">
            <span className="kit-label">Εβδομαδιαίο πρόγραμμα</span>
            {week.map((day) => (
              <WeekRow key={day.dow} day={day} />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Χωρητικότητα" hint="Πόσα Γυρίσματα χωράνε ταυτόχρονα (1 έως 20).">
              <Input name="capacity" type="number" min={1} max={20} required defaultValue={capacity} />
            </Field>
            <Field label="Βήμα ώρας έναρξης">
              <Select name="stepMinutes" defaultValue={step}>
                {STEP_CHOICES.map((minutes) => (
                  <option key={minutes} value={minutes}>{STEP_LABELS[minutes]}</option>
                ))}
              </Select>
            </Field>
          </div>
          <fieldset className="grid gap-2">
            <legend className="kit-label mb-2">Επιτρεπτές διάρκειες</legend>
            <div className="flex flex-wrap gap-3">
              {BOOKING_DURATION_CHOICES.map((hours) => (
                <label key={hours} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="durations" value={hours} defaultChecked={durations.includes(hours)} />
                  {formatHours(hours)} ώρ.
                </label>
              ))}
            </div>
            <MutedNote>Ο πελάτης διαλέγει μόνο από αυτές· η ομάδα μπορεί ελεύθερα από 0,5 έως 12 ώρες.</MutedNote>
          </fieldset>
        </ActionForm>
      </div>
    </Panel>
  );
}

function WeekRow({ day }: { day: BookingWeekDay }) {
  return (
    <div className="grid items-center gap-2 sm:grid-cols-[8rem_auto_1fr_1fr]">
      <span className="text-sm font-medium">{BOOKING_DAY_LABELS[day.dow]}</span>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name={`open-${day.dow}`} defaultChecked={day.isOpen} />
        Ανοιχτά
      </label>
      <Input type="time" name={`from-${day.dow}`} aria-label={`${BOOKING_DAY_LABELS[day.dow]}, από`} defaultValue={day.opens ?? ""} />
      <Input type="time" name={`to-${day.dow}`} aria-label={`${BOOKING_DAY_LABELS[day.dow]}, έως`} defaultValue={day.closes ?? ""} />
    </div>
  );
}
