"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition, type RefObject } from "react";

import { Panel } from "@/spaces/kit/panel";

import {
  bookingHref,
  withAgreement,
  withDay,
  withHours,
  withKind,
  withTime,
  type BookingSelection,
} from "../booking-links";
import { formatHours } from "../helpers-time";
import { E5Confirm } from "./e5-confirm";
import { bookingStepOf, dayLabel, groupDays, type DayView } from "./e5-model";
import { DayPicker, FirstFreeHint, Legend, Steps } from "./e5-picker";

export interface E5Choice {
  id: string;
  label: string;
  isAvailable: boolean;
}

export interface E5BookingProps {
  selection: BookingSelection;
  days: readonly DayView[];
  durations: readonly number[];
  // Η διάρκεια που διάλεξε ο πελάτης (null πριν από το βήμα 2) και οι ελεύθερες ώρες της (null πριν).
  hours: number | null;
  times: readonly string[] | null;
  time: string | null;
  agreements: readonly E5Choice[];
  kinds: readonly E5Choice[];
  agreementId: string;
  kindId: string;
  kindLabel: string;
  noticeHours: number;
  cancelHours: number;
  horizonDays: number;
  needsApproval: boolean;
  messagesHref: string;
}

// Μόλις ανοίξει το επόμενο βήμα, η σελίδα κατεβαίνει εκεί: ο πελάτης δεν ψάχνει πού συνεχίζει.
const useScrollOnStep = (step: number): RefObject<HTMLElement | null> => {
  const ref = useRef<HTMLElement | null>(null);
  const isFirst = useRef(true);
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);
  return ref;
};

// Πακέτο και είδος, μόνο όταν ο πελάτης έχει να διαλέξει (στο prototype υπάρχει ένα).
function Choices({
  label,
  items,
  current,
  onPick,
}: {
  label: string;
  items: readonly E5Choice[];
  current: string;
  onPick: (id: string) => void;
}) {
  if (items.length < 2) return null;
  return (
    <Panel label={label}>
      <div className="e-times">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="button"
            aria-pressed={item.id === current}
            disabled={!item.isAvailable}
            onClick={() => onPick(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}

// Κράτηση σε βήματα (prototype `screens/e5-booking.tsx`): μέρα, διάρκεια, ώρα, επιβεβαίωση. Κάθε επιλογή γράφεται στη
// διεύθυνση και η σελίδα φέρνει από τη βάση τις μέρες και τις ελεύθερες ώρες (όπως η παλιά σελίδα).
export function E5Booking(props: E5BookingProps) {
  const { selection, days, hours, times, time } = props;
  const router = useRouter();
  const [isBusy, startTransition] = useTransition();
  const base: BookingSelection = {
    ...selection,
    agreement: props.agreementId,
    kind: props.kindId,
  };
  const go = (next: BookingSelection) =>
    startTransition(() => router.push(bookingHref(next), { scroll: false }));
  const date = selection.day ?? null;
  const step = bookingStepOf(date, hours, time);
  const stepRef = useScrollOnStep(step);
  const refFor = (n: number) => (n === step ? stepRef : undefined);
  const hasAnyDay = days.some((day) => day.status.kind === "ok");
  const isReschedule = selection.reschedule !== undefined;

  return (
    <div className="e-form" style={{ maxWidth: "none" }} aria-busy={isBusy}>
      {!hasAnyDay && !isReschedule && (
        <section className="card notice" data-kind="empty" role="status">
          <h2>Δεν σου μένει γύρισμα να κλείσεις</h2>
          <p className="muted">
            Στις επόμενες {props.horizonDays} μέρες δεν υπάρχει ελεύθερη μέρα
            στο πακέτο σου. Μπορείς να μας ζητήσεις ένα επιπλέον γύρισμα.
          </p>
          <Link
            className="button"
            data-primary="true"
            href={props.messagesHref}
          >
            Ζήτα επιπλέον γύρισμα
          </Link>
        </section>
      )}
      {!isReschedule && (
        <>
          <Choices
            label="Πακέτο"
            items={props.agreements}
            current={props.agreementId}
            onPick={(id) => go(withAgreement(selection, id))}
          />
          <Choices
            label="Τι κλείνεις"
            items={props.kinds}
            current={props.kindId}
            onPick={(id) => go(withKind(base, id))}
          />
        </>
      )}
      <Steps step={step} />
      <Panel label={isReschedule ? "1. Διάλεξε νέα μέρα" : "1. Διάλεξε μέρα"}>
        <p className="muted">
          Κλείνεις τουλάχιστον {props.noticeHours} ώρες πριν. Οι γκρι μέρες δεν
          κλείνονται· γράφουν από κάτω γιατί.
        </p>
        {hasAnyDay && <FirstFreeHint days={days} />}
        <Legend days={days} />
        <DayPicker
          groups={groupDays(days)}
          date={date}
          isBusy={isBusy}
          onPick={(day) => go(withDay(base, day))}
        />
      </Panel>

      {date && (
        <section ref={refFor(2)}>
          <Panel label="2. Πόσες ώρες;">
            <p className="muted">Για την {dayLabel(date)}.</p>
            <div className="e-times">
              {props.durations.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="button"
                  aria-pressed={hours === value}
                  disabled={isBusy}
                  onClick={() => go(withHours(base, String(value)))}
                >
                  {formatHours(value)} ώρες
                </button>
              ))}
            </div>
          </Panel>
        </section>
      )}

      {date && hours !== null && times && (
        <section ref={refFor(3)}>
          <Panel label="3. Τι ώρα ξεκινάμε;">
            {times.length === 0 ? (
              <p className="e-warn">
                Δεν υπάρχει ελεύθερη ώρα για {formatHours(hours)} ώρες εκείνη τη
                μέρα. Δοκίμασε μικρότερη διάρκεια ή άλλη μέρα.
              </p>
            ) : (
              <div className="e-times">
                {times.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="button"
                    aria-pressed={time === value}
                    disabled={isBusy}
                    onClick={() =>
                      go(withTime({ ...base, hours: String(hours) }, value))
                    }
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}
            <p className="muted">Ώρα Ελλάδας.</p>
          </Panel>
        </section>
      )}

      {date && hours !== null && time && (
        <section ref={refFor(4)}>
          <Panel label="4. Έλεγξε και επιβεβαίωσε">
            <E5Confirm
              agreementId={props.agreementId}
              kindId={props.kindId}
              kindLabel={props.kindLabel}
              date={date}
              time={time}
              hours={hours}
              cancelHours={props.cancelHours}
              needsApproval={props.needsApproval}
              rescheduleId={selection.reschedule ?? null}
            />
          </Panel>
        </section>
      )}
    </div>
  );
}
