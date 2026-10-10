import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

import type { BookingSelection } from "../booking-links";
import { planBooking } from "../booking-plan";
import type { BookingOptions } from "../booking-types";
import { listBookingDays, listBookingSlots } from "../queries-booking";
import { athensTime } from "../helpers-time";

import { BookingConfirm } from "./booking-confirm";
import {
  AgreementChoices,
  DayGrid,
  DurationChoices,
  KindChoices,
  TimeChoices,
} from "./booking-steps";

// E5: η κράτηση του Πελάτη σε μία σελίδα. Η κατάσταση είναι στο URL· κάθε βήμα φορτώνει από τη βάση.
export async function BookingPage({
  options,
  selection,
}: {
  options: BookingOptions;
  selection: BookingSelection;
}) {
  if (!options.isSet) return <NotOpen />;
  const plan = planBooking(options, selection);
  if (!plan) return <NoProvision />;
  const days = await listBookingDays(plan.agreement.id, plan.kind.id);
  if (!days.ok) return <LoadFailed />;
  const slots =
    selection.day && plan.hours !== null
      ? await listBookingSlots(plan.agreement.id, plan.kind.id, selection.day, plan.hours)
      : null;
  if (slots && !slots.ok) return <LoadFailed />;
  const time = selection.time ?? "";
  const isTimeOpen = slots?.ok === true && slots.data.some((iso) => athensTime(iso) === time);
  const isReschedule = selection.reschedule !== undefined;

  return (
    <div className="grid gap-5">
      {!isReschedule && (
        <>
          <AgreementChoices agreements={options.agreements} selection={selection} current={plan.agreement} />
          <KindChoices agreement={plan.agreement} selection={selection} current={plan.kind} />
        </>
      )}
      <DayGrid days={days.data} plan={plan} selection={selection} />
      {selection.day && plan.hours !== null && (
        <DurationChoices durations={options.durations} plan={plan} selection={selection} />
      )}
      {slots?.ok && <TimeChoices slots={slots.data} plan={plan} selection={selection} />}
      {isTimeOpen && <BookingConfirm plan={plan} selection={selection} time={time} />}
    </div>
  );
}

function NotOpen() {
  return (
    <Notice kind="empty" title="Οι κρατήσεις δεν έχουν ανοίξει ακόμα">
      <p className="m-0">Η ομάδα θα ανοίξει τις κρατήσεις σύντομα.</p>
    </Notice>
  );
}

function NoProvision() {
  return (
    <Notice kind="empty" title="Δεν έχεις διαθέσιμη Παροχή">
      <p className="m-0">Η Παροχή της Συμφωνίας σου έχει τελειώσει ή δεν έχει ξεκινήσει ακόμα.</p>
      <Link href="/app/filming" className={buttonVariants({ variant: "default", size: "sm" })}>
        Στείλε μήνυμα στην ομάδα
      </Link>
    </Notice>
  );
}

function LoadFailed() {
  return (
    <Notice kind="error" title="Δεν φόρτωσαν οι ώρες">
      <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
    </Notice>
  );
}
