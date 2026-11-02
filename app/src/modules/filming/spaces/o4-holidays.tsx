import { ActionButton, SettingsCard } from "@/modules/settings";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge, fmtDate } from "@/spaces/screens/shared";

import { toggleHolidayOpen } from "../actions-booking";
import type { BookingHoliday } from "../booking-types";
import { dateLeadOf } from "./o4-hours";
import { holidayLook } from "./o4-model";

function HolidayState({ holiday }: { holiday: BookingHoliday }) {
  const look = holidayLook(holiday);
  if (look === "open")
    return <Badge tone="attention">ανοιχτή ως εξαίρεση</Badge>;
  if (look === "opened-closed-day")
    return (
      <Badge tone="attention">
        ανοιχτή, αλλά η μέρα είναι κλειστή στο Ωράριο
      </Badge>
    );
  return <Badge tone="faded">κλειστή αυτόματα</Badge>;
}

// Αργίες φέτος και του χρόνου (prototype `screens/o4-holidays.tsx`): κλειστές μόνες τους, «Άνοιγμα ως εξαίρεση» με το
// πραγματικό toggleHolidayOpen. Οι περασμένες δεν αλλάζουν.
export function O4Holidays({
  holidays,
}: {
  holidays: readonly BookingHoliday[];
}) {
  return (
    <SettingsCard title="Επίσημες αργίες">
      <p className="muted o-hint">
        Κλειστές μόνες τους. Αν θες να δουλέψεις, τις ανοίγεις ως εξαίρεση.
      </p>
      {holidays.length === 0 ? (
        <p className="muted o-hint">Οι αργίες υπολογίζονται αυτόματα.</p>
      ) : (
        <RowList>
          {holidays.map((h) => (
            <ListRow
              key={h.day}
              isFaded={h.isPast}
              lead={dateLeadOf(h.day)}
              title={h.name}
              sub={`${fmtDate(h.day)} · ${h.movable ? "κινητή" : "σταθερή"}`}
              aside={
                <>
                  <HolidayState holiday={h} />
                  {!h.isPast && (
                    <ActionButton
                      action={toggleHolidayOpen}
                      fields={{
                        day: h.day,
                        open: h.isOpened ? "false" : "true",
                      }}
                      label={
                        h.isOpened ? "Κλείσιμο ξανά" : "Άνοιγμα ως εξαίρεση"
                      }
                    />
                  )}
                </>
              }
            />
          ))}
        </RowList>
      )}
      <p className="muted o-hint">
        Οι αργίες που εξαρτώνται από το Πάσχα υπολογίζονται από το ορθόδοξο
        Πάσχα κάθε έτους. Ανοιγμένη αργία σε μέρα κλειστή στο Ωράριο θέλει ώρες
        στις Εξαιρέσεις. Η αλλαγή γράφεται στο Ίχνος.
      </p>
    </SettingsCard>
  );
}
