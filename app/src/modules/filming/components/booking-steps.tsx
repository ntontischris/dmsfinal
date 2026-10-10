import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

import { bookingHref, withAgreement, withDay, withHours, withKind, withTime, type BookingSelection } from "../booking-links";
import { hasProvision, type BookingPlan } from "../booking-plan";
import type { BookingDay } from "../booking-types";
import { athensTime, formatDate, formatHours } from "../helpers-time";
import type { BookingAgreement, BookingKind } from "../types";

// Τα βήματα της E5 (Server Components): Συμφωνία και Είδος, πλέγμα ημερών, διάρκεια, ώρα. Κάθε βήμα είναι σύνδεσμος.

const choice = (active: boolean) =>
  buttonVariants({ variant: active ? "primary" : "default", size: "sm" });

export function AgreementChoices({
  agreements,
  selection,
  current,
}: {
  agreements: readonly BookingAgreement[];
  selection: BookingSelection;
  current: BookingAgreement;
}) {
  if (agreements.length < 2) return null;
  return (
    <Choices label="Συμφωνία">
      {agreements.map((agreement) => (
        <Link
          key={agreement.id}
          href={bookingHref(withAgreement(selection, agreement.id))}
          className={choice(agreement.id === current.id)}
        >
          {agreement.title}
        </Link>
      ))}
    </Choices>
  );
}

export function KindChoices({
  agreement,
  selection,
  current,
}: {
  agreement: BookingAgreement;
  selection: BookingSelection;
  current: BookingKind;
}) {
  return (
    <Choices label="Είδος Παροχής">
      {agreement.kinds.map((kind) => (
        <span key={kind.id} className="inline-flex items-center gap-2">
          {hasProvision(kind) ? (
            <Link href={bookingHref(withKind(selection, kind.id))} className={choice(kind.id === current.id)}>
              {kind.label}
            </Link>
          ) : (
            <Badge>{kind.label}</Badge>
          )}
          {kind.balance !== null && (
            <span className="text-sm text-muted-foreground">
              {kind.balance > 0 ? `υπόλοιπο ${formatHours(kind.balance)}` : "χωρίς υπόλοιπο"}
            </span>
          )}
        </span>
      ))}
    </Choices>
  );
}

export function DayGrid({
  days,
  plan,
  selection,
}: {
  days: readonly BookingDay[];
  plan: BookingPlan;
  selection: BookingSelection;
}) {
  const base = { ...selection, agreement: plan.agreement.id, kind: plan.kind.id };
  return (
    <Choices label="Μέρα">
      <div className="grid w-full gap-2 sm:grid-cols-2 md:grid-cols-4">
        {days.map((day) => (
          <DayCell key={day.day} day={day} href={bookingHref(withDay(base, day.day))} selected={day.day === selection.day} />
        ))}
      </div>
    </Choices>
  );
}

function DayCell({ day, href, selected }: { day: BookingDay; href: string; selected: boolean }) {
  const title = `${formatDate(`${day.day}T12:00:00Z`)} · ${day.label}`;
  const content = (
    <span className="grid gap-0.5 text-left">
      <span className="font-medium">{formatDate(`${day.day}T12:00:00Z`)}</span>
      <span className="text-xs text-muted-foreground">{day.label}</span>
    </span>
  );
  if (day.status !== "free")
    return <span aria-disabled="true" title={title} className="rounded-sm border border-dashed px-3 py-2 opacity-60">{content}</span>;
  return (
    <Link href={href} title={title} aria-current={selected ? "true" : undefined}
      className={`rounded-sm border px-3 py-2 no-underline ${selected ? "border-primary bg-primary/10" : "bg-card hover:border-border-strong"}`}>
      {content}
    </Link>
  );
}

export function DurationChoices({
  durations,
  plan,
  selection,
}: {
  durations: readonly number[];
  plan: BookingPlan;
  selection: BookingSelection;
}) {
  const base = { ...selection, agreement: plan.agreement.id, kind: plan.kind.id };
  return (
    <Choices label="Διάρκεια">
      {durations.map((hours) => (
        <Link key={hours} href={bookingHref(withHours(base, String(hours)))} className={choice(hours === plan.hours)}>
          {formatHours(hours)} ώρες
        </Link>
      ))}
    </Choices>
  );
}

export function TimeChoices({
  slots,
  plan,
  selection,
}: {
  slots: readonly string[];
  plan: BookingPlan;
  selection: BookingSelection;
}) {
  const base = { ...selection, agreement: plan.agreement.id, kind: plan.kind.id, hours: String(plan.hours ?? "") };
  if (slots.length === 0)
    return (
      <Notice kind="empty" title="Καμία ελεύθερη ώρα αυτή τη μέρα">
        <p className="m-0">Δοκίμασε άλλη διάρκεια ή άλλη μέρα.</p>
      </Notice>
    );
  return (
    <Choices label="Ώρα (Ώρα Ελλάδας)">
      {slots.map((iso) => {
        const time = athensTime(iso);
        return (
          <Link key={iso} href={bookingHref(withTime(base, time))} className={choice(time === selection.time)}>
            {time}
          </Link>
        );
      })}
    </Choices>
  );
}

// Μια ομάδα επιλογών με κεφαλίδα· σε κινητό τα κουμπιά πέφτουν σε στοίβα.
function Choices({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <h3 className="kit-label m-0">{label}</h3>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
