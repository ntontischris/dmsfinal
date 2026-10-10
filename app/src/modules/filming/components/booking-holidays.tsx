import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { toggleHolidayOpen } from "../actions-booking";
import type { BookingHoliday } from "../booking-types";
import { formatDate } from "../helpers-time";

import { ActionForm } from "./action-form";

// Ρυθμίσεις › Γυρίσματα: οι αργίες φέτος και του χρόνου. Κλειστές αυτόματα· ο Ιδιοκτήτης ανοίγει όποια θέλει.
export function BookingHolidays({ holidays }: { holidays: readonly BookingHoliday[] }) {
  return (
    <Panel label="Αργίες">
      {holidays.length === 0 ? (
        <Notice kind="empty" title="Καμία αργία">
          <p className="m-0">Οι αργίες υπολογίζονται αυτόματα.</p>
        </Notice>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Αργία</Th>
              <Th>Ημερομηνία</Th>
              <Th>Κατάσταση</Th>
              <Th>Ενέργεια</Th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((holiday) => (
              <HolidayRow key={holiday.day} holiday={holiday} />
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}

function HolidayRow({ holiday }: { holiday: BookingHoliday }) {
  return (
    <Tr>
      <Td data-label="Αργία">
        <span className="grid gap-1">
          <span>{holiday.name}</span>
          {holiday.movable && <Badge>κινητή</Badge>}
        </span>
      </Td>
      <Td data-label="Ημερομηνία">{formatDate(`${holiday.day}T12:00:00Z`)}</Td>
      <Td data-label="Κατάσταση">{describeHoliday(holiday)}</Td>
      <Td data-label="Ενέργεια">
        {holiday.isPast ? (
          "—"
        ) : (
          <ActionForm
            action={toggleHolidayOpen}
            submitLabel={holiday.isOpened ? "Κλείσιμο" : "Άνοιγμα"}
            variant="default"
            size="sm"
          >
            <input type="hidden" name="day" value={holiday.day} />
            <input type="hidden" name="open" value={holiday.isOpened ? "false" : "true"} />
          </ActionForm>
        )}
      </Td>
    </Tr>
  );
}

// Ανοιγμένη αργία σε μέρα που είναι κλειστή στο εβδομαδιαίο Ωράριο μένει χωρίς ώρες: το λέμε, για να μπουν ώρες στις Εξαιρέσεις.
function describeHoliday(holiday: BookingHoliday): string {
  if (holiday.isOpen) return "Ανοιχτή";
  if (holiday.isOpened) return "Ανοιχτή, αλλά η μέρα είναι κλειστή στο Ωράριο: βάλε ώρες στις Εξαιρέσεις";
  return "Κλειστή";
}
