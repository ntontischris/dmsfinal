"use client";

import Link from "next/link";
import { useState } from "react";

import { BOOKING_HOURS, FILMING_RULES } from "@/data/filming";
import {
  TODAY_ISO,
  addDays,
  balanceOfDay,
  lastLocationOf,
  weekdayOf,
} from "@/screens/e4-model";
import {
  AGREEMENT_ID,
  MONTHS,
  WEEKDAYS,
  cancelDeadlineOf,
  dayStatusOf,
  freeStartTimes,
  type DayStatus,
} from "@/screens/e5-days";
import { Badge, fmtDate } from "@/screens/shared";

import "./e5.css";

interface BookingProps {
  noBenefit: boolean;
  noticeDays: number;
  cancelHours: number;
  messagesHref: string;
}

interface DayGroup {
  month: string;
  days: readonly { date: string; status: DayStatus }[];
}

const groupDays = (noBenefit: boolean, noticeDays: number): DayGroup[] => {
  const days = Array.from({ length: FILMING_RULES.horizonDays }, (_, index) => {
    const date = addDays(TODAY_ISO, index);
    return { date, status: dayStatusOf(date, noticeDays, noBenefit) };
  });
  const months = [...new Set(days.map((day) => day.date.slice(0, 7)))];
  return months.map((key) => ({
    month: `${MONTHS[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`,
    days: days.filter((day) => day.date.startsWith(key)),
  }));
};

function DayPicker({
  groups,
  date,
  onPick,
}: {
  groups: readonly DayGroup[];
  date: string | null;
  onPick: (date: string) => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.month}>
          <h3>{group.month}</h3>
          <div className="e-days">
            {group.days.map(({ date: day, status }) => (
              <button
                key={day}
                type="button"
                className="button e-day"
                aria-pressed={date === day}
                disabled={status.kind === "blocked"}
                onClick={() => onPick(day)}
              >
                <span>
                  {WEEKDAYS[weekdayOf(day)]} {Number(day.slice(8))}/
                  {Number(day.slice(5, 7))}
                </span>
                <small>
                  {status.kind === "blocked"
                    ? status.reason
                    : `${status.left} Παροχή`}
                </small>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function Summary({
  date,
  start,
  duration,
  cancelHours,
}: {
  date: string;
  start: string;
  duration: number;
  cancelHours: number;
}) {
  const balance = balanceOfDay(AGREEMENT_ID, date);
  const deadline = cancelDeadlineOf(date, start, cancelHours);
  return (
    <div className="e-info">
      <p>
        <strong>
          {fmtDate(date)}, {start}, {duration} ώρες
        </strong>
      </p>
      <p>
        Δεσμεύει 1 Παροχή «Γύρισμα» της Περιόδου «{balance?.period.label}»
        (μένουν {(balance?.left ?? 1) - 1} μετά).
      </p>
      <p>
        <strong>Όριο ακύρωσης: {cancelHours} ώρες πριν.</strong> Μέχρι{" "}
        {fmtDate(deadline.date)} {deadline.time} μεταθέτεις ή ακυρώνεις μόνος
        σου. Μετά, μπορείς μόνο να στείλεις αίτημα. Αν ακυρώσεις αργά, η Παροχή
        καίγεται.
      </p>
    </div>
  );
}

// Κράτηση σε τρία βήματα στην ίδια σελίδα: μέρα, διάρκεια, ώρα. Ο πελάτης δεν βλέπει άτομα ούτε Εξοπλισμό.
export function E5Booking({
  noBenefit,
  noticeDays,
  cancelHours,
  messagesHref,
}: BookingProps) {
  const [date, setDate] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [location, setLocation] = useState(lastLocationOf("kypseli"));
  const [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const groups = groupDays(noBenefit, noticeDays);
  const hasAnyDay = groups.some((group) =>
    group.days.some((day) => day.status.kind === "ok"),
  );
  const times = date && duration ? freeStartTimes(date, duration) : [];
  const pickDate = (value: string) => {
    setDate(value);
    setStart(null);
  };
  const pickDuration = (value: number) => {
    setDuration(value);
    setStart(null);
  };

  if (confirmed && date && start && duration)
    return (
      <section className="card" role="status">
        <Badge tone="strong">
          {FILMING_RULES.needsApproval
            ? "Αναμένει έγκριση"
            : "Προγραμματισμένο"}
        </Badge>
        <h2>Η κράτηση καταχωρήθηκε</h2>
        <p>
          {fmtDate(date)}, {start}, {duration} ώρες · {location}
        </p>
        <p>
          {FILMING_RULES.needsApproval
            ? "Η ώρα και η Παροχή είναι δεσμευμένες από τώρα. Η Διαχείριση θα το εγκρίνει ή θα προτείνει άλλη ώρα· θα πάρεις email."
            : "Το Γύρισμα είναι προγραμματισμένο χωρίς έγκριση (ο κανόνας έγκρισης είναι κλειστός)."}
        </p>
        <p className="muted">
          (prototype: δεν αποθηκεύεται. Αν ο κανόνας «χρειάζεται έγκριση» ήταν
          κλειστός, θα έβγαινε απευθείας «Προγραμματισμένο».)
        </p>
      </section>
    );

  return (
    <div className="e-form" style={{ maxWidth: "none" }}>
      {!hasAnyDay && (
        <section className="card notice" data-kind="empty" role="status">
          <h2>Δεν έχεις διαθέσιμη Παροχή «Γύρισμα»</h2>
          <p className="muted">
            Δεν υπάρχει ελεύθερη μέρα στις επόμενες {FILMING_RULES.horizonDays}{" "}
            μέρες. Μπορείς να ζητήσεις έξτρα Γύρισμα με αίτημα προς την ομάδα.
          </p>
          <Link className="button" data-primary="true" href={messagesHref}>
            Στείλε Αίτημα τύπου Γύρισμα
          </Link>
        </section>
      )}
      <section className="card">
        <h2>1. Διάλεξε μέρα</h2>
        <p className="muted">
          Ελάχιστη ειδοποίηση {noticeDays} μέρες. Οι μέρες χωρίς Παροχή γράφουν
          «Χωρίς Παροχή».
        </p>
        <DayPicker groups={groups} date={date} onPick={pickDate} />
      </section>

      {date && (
        <section className="card">
          <h2>2. Διάρκεια</h2>
          <div className="e-times">
            {BOOKING_HOURS.durations.map((value) => (
              <button
                key={value}
                type="button"
                className="button"
                aria-pressed={duration === value}
                onClick={() => pickDuration(value)}
              >
                {value} ώρες
              </button>
            ))}
          </div>
        </section>
      )}

      {date && duration && (
        <section className="card">
          <h2>3. Ώρα έναρξης</h2>
          {times.length === 0 ? (
            <p className="e-warn">
              Δεν υπάρχει ελεύθερη ώρα για {duration} ώρες εκείνη τη μέρα.
              Δοκίμασε μικρότερη διάρκεια ή άλλη μέρα.
            </p>
          ) : (
            <div className="e-times">
              {times.map((time) => (
                <button
                  key={time}
                  type="button"
                  className="button"
                  aria-pressed={start === time}
                  onClick={() => setStart(time)}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {date && duration && start && (
        <section className="card e-form">
          <h2>Σύνοψη και επιβεβαίωση</h2>
          <Summary
            date={date}
            start={start}
            duration={duration}
            cancelHours={cancelHours}
          />
          <label>
            Πού
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <label>
            Σημείωση για την ομάδα (προαιρετικά)
            <textarea
              className="input"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-primary="true"
              disabled={!location.trim()}
              onClick={() => setConfirmed(true)}
            >
              Επιβεβαίωση κράτησης
            </button>
          </div>
          <p className="muted">
            {FILMING_RULES.needsApproval
              ? "Θα περιμένει έγκριση από τη Διαχείριση."
              : "Θα προγραμματιστεί αμέσως."}
          </p>
        </section>
      )}
    </div>
  );
}
