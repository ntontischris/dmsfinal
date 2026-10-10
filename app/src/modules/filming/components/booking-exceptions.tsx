import { Field, Input, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { deleteBookingException, saveBookingException } from "../actions-booking";
import type { BookingException } from "../booking-types";
import { formatDate } from "../helpers-time";
import { TextArea } from "./form-fields";

import { ActionForm } from "./action-form";

// Ρυθμίσεις › Γυρίσματα: εξαιρέσεις ημερών από σήμερα και φόρμα «Νέα εξαίρεση».
export function BookingExceptions({ exceptions }: { exceptions: readonly BookingException[] }) {
  return (
    <Panel label="Εξαιρέσεις">
      <div className="grid gap-5">
        {exceptions.length === 0 ? (
          <Notice kind="empty" title="Καμία εξαίρεση">
            <p className="m-0">Οι εξαιρέσεις ημερών (κλειστές ή με άλλες ώρες) εμφανίζονται εδώ.</p>
          </Notice>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Μέρα</Th>
                <Th>Ωράριο</Th>
                <Th>Σημείωση</Th>
                <Th>Ενέργεια</Th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((exception) => (
                <ExceptionRow key={exception.day} exception={exception} />
              ))}
            </tbody>
          </Table>
        )}
        <NewExceptionForm />
      </div>
    </Panel>
  );
}

function ExceptionRow({ exception }: { exception: BookingException }) {
  return (
    <Tr>
      <Td data-label="Μέρα">{formatDate(`${exception.day}T12:00:00Z`)}</Td>
      <Td data-label="Ωράριο">{describeHours(exception)}</Td>
      <Td data-label="Σημείωση">{exception.note ?? "—"}</Td>
      <Td data-label="Ενέργεια">
        <ActionForm action={deleteBookingException} submitLabel="Διαγραφή" variant="danger" size="sm">
          <input type="hidden" name="day" value={exception.day} />
        </ActionForm>
      </Td>
    </Tr>
  );
}

function describeHours(exception: BookingException): string {
  if (exception.isClosed) return "Κλειστή";
  const hours = exception.opens && exception.closes ? `${exception.opens}–${exception.closes}` : "Ωράριο της εβδομάδας";
  return exception.capacity === null ? hours : `${hours} · χωρητικότητα ${exception.capacity}`;
}

function NewExceptionForm() {
  return (
    <ActionForm action={saveBookingException} submitLabel="Προσθήκη εξαίρεσης" variant="default" resetOnSuccess>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Μέρα">
          <Input name="day" type="date" required />
        </Field>
        <Field label="Τι ισχύει">
          <Select name="mode" defaultValue="closed">
            <option value="closed">Κλειστή</option>
            <option value="hours">Άλλες ώρες</option>
          </Select>
        </Field>
        <Field label="Από (μόνο για άλλες ώρες)">
          <Input name="opens" type="time" />
        </Field>
        <Field label="Έως (μόνο για άλλες ώρες)">
          <Input name="closes" type="time" />
        </Field>
        <Field label="Χωρητικότητα (προαιρετική)">
          <Input name="capacity" type="number" min={1} max={20} />
        </Field>
        <Field label="Σημείωση">
          <TextArea name="note" maxLength={500} />
        </Field>
      </div>
    </ActionForm>
  );
}
