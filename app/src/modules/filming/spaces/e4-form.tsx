"use client";

import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";
import { Panel } from "@/spaces/kit/panel";
import { fmtDate } from "@/spaces/screens/shared";

import { bookFilming, bookInternalFilming } from "../actions-book";
import { DURATION_PRESETS, defaultHours, defaultKindId } from "../helpers";
import type { NewFilmingPrefill } from "../blocked-prefill";
import type { FilmingFromRequest } from "../request-prefill";
import type { BookingAgreement, NamedRef } from "../types";
import { Availability, DurationField, SlotNotice } from "./e4-parts";
import {
  dayWithWeekday,
  durationChoiceOf,
  hoursOf,
  isIsoDay,
  isPastDay,
  uniqueClients,
} from "./e4-model";
import type { StartSlot } from "./e4-start";

export interface E4Preferred {
  clientId: string;
  location: string;
}

export interface E4FormProps {
  options: readonly BookingAgreement[];
  // Οι ανοιχτές Εσωτερικές Παραγωγές (κενό αν δεν επιτρέπεται Γύρισμα χωρίς Πελάτη).
  productions: readonly NamedRef[];
  today: string;
  // Η πρώτη εργάσιμη μέρα και ώρα μέσα στο Ωράριο (null = σήμερα, 09:00).
  start: StartSlot | null;
  preferred: E4Preferred | null;
  prefill: NewFilmingPrefill | null;
  fromRequest: FilmingFromRequest | null;
}

type Mode = "client" | "internal";

// Νέο Γύρισμα από την ομάδα (prototype `screens/e4-form.tsx`): ξεκινά «προγραμματισμένο», χωρίς έγκριση.
// Η αποθήκευση είναι τα πραγματικά bookFilming / bookInternalFilming· με επιτυχία η σελίδα πάει στο νέο Γύρισμα (E3).
export function E4Form({
  options,
  productions,
  today,
  start: startSlot,
  preferred,
  prefill,
  fromRequest,
}: E4FormProps) {
  const clients = uniqueClients(options);
  const requested = clients.find(
    (c) => c.id === (fromRequest?.clientId ?? preferred?.clientId),
  );
  const canInternal = productions.length > 0 && !fromRequest;
  const [mode, setMode] = useState<Mode>(
    clients.length === 0 && canInternal ? "internal" : "client",
  );
  const [clientId, setClientId] = useState(
    requested?.id ?? clients[0]?.id ?? "",
  );
  const agreements = options.filter((a) => a.client.id === clientId);
  const [agreementId, setAgreementId] = useState(agreements[0]?.id ?? "");
  const agreement =
    agreements.find((a) => a.id === agreementId) ?? agreements[0];
  const [kindId, setKindId] = useState(defaultKindId(agreement?.kinds ?? []));
  const kind = agreement?.kinds.find((k) => k.id === kindId);
  const startHours = prefill?.hours ?? defaultHours(kind);
  const [productionId, setProductionId] = useState("");
  const [date, setDate] = useState(prefill?.date ?? startSlot?.date ?? today);
  const [start, setStart] = useState(
    prefill?.time ?? startSlot?.time ?? "09:00",
  );
  const [duration, setDuration] = useState(
    durationChoiceOf(startHours, DURATION_PRESETS),
  );
  const [freeHours, setFreeHours] = useState(String(startHours));
  const [location, setLocation] = useState(
    requested && requested.id === preferred?.clientId ? preferred.location : "",
  );
  const [note, setNote] = useState("");
  const isInternal = mode === "internal";
  // Δύο φόρμες-actions, μία ενεργή κάθε φορά (το action του useActionState δεν αλλάζει στη μέση).
  const clientForm = useKeptForm(bookFilming);
  const internalForm = useKeptForm(bookInternalFilming);
  const { state, isPending, onSubmit, formRef } = isInternal ? internalForm : clientForm;
  const hours = hoursOf(duration, freeHours);

  const resetKind = (next: BookingAgreement | undefined) => {
    const first = next?.kinds.find((k) => k.id === defaultKindId(next.kinds));
    setKindId(defaultKindId(next?.kinds ?? []));
    setDuration(durationChoiceOf(defaultHours(first), DURATION_PRESETS));
    setFreeHours(String(defaultHours(first)));
  };
  const handleClient = (id: string) => {
    const next = options.find((a) => a.client.id === id);
    setClientId(id);
    setAgreementId(next?.id ?? "");
    resetKind(next);
  };
  const handleAgreement = (id: string) => {
    setAgreementId(id);
    resetKind(agreements.find((a) => a.id === id));
  };
  const handleKind = (id: string) => {
    const next = agreement?.kinds.find((k) => k.id === id);
    setKindId(id);
    setDuration(durationChoiceOf(defaultHours(next), DURATION_PRESETS));
    setFreeHours(String(defaultHours(next)));
  };

  if (!isInternal && clients.length === 0)
    return (
      <p className="e-info" role="status">
        Δεν υπάρχει Συμφωνία που να μπορεί να κλείσει Γύρισμα αυτή τη στιγμή.
      </p>
    );

  return (
    <form
      id="e4-form"
      ref={formRef}
      onSubmit={onSubmit}
      aria-busy={isPending}
      noValidate
    >
      <Panel label={prefill ? "Μετατροπή από Κλεισμένο χρόνο" : "Στοιχεία"}>
        <div className="e-form">
          {prefill && (
            <p className="e-info">
              Από Κλεισμένο χρόνο ({fmtDate(prefill.date)} {prefill.time}). Η
              ώρα έχει προσυμπληρωθεί. Με τη μετατροπή ο Κλεισμένος χρόνος
              σβήνει όταν αποθηκευτεί το Γύρισμα. Τα άτομα δεν μπαίνουν μόνα
              τους στο Συνεργείο.
              <input
                type="hidden"
                name="fromBlocked"
                value={prefill.fromBlocked}
              />
            </p>
          )}
          {fromRequest && (
            <p className="e-info">
              Το Γύρισμα κλείνεται από ένα Αίτημα Μηνύματος: με την επιτυχία το
              Αίτημα κλείνει μόνο του.
              <input
                type="hidden"
                name="requestMessageId"
                value={fromRequest.messageId}
              />
            </p>
          )}
          {canInternal && (
            <div className="e-field">
              Για
              <div className="btn-row">
                {(["client", "internal"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="button e-pick"
                    aria-pressed={mode === value}
                    onClick={() => setMode(value)}
                  >
                    {value === "client" ? "Πελάτη" : "Εσωτερική Παραγωγή"}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isInternal ? (
            <label>
              Εσωτερική Παραγωγή
              <select
                className="input"
                name="productionId"
                value={productionId}
                onChange={(e) => setProductionId(e.target.value)}
              >
                <option value="" disabled>
                  Διάλεξε Παραγωγή…
                </option>
                {productions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label>
                Πελάτης
                <select
                  className="input"
                  value={clientId}
                  onChange={(e) => handleClient(e.target.value)}
                >
                  {clients.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              {agreements.length > 1 ? (
                <label>
                  Συμφωνία
                  <select
                    className="input"
                    name="agreementId"
                    value={agreement?.id ?? ""}
                    onChange={(e) => handleAgreement(e.target.value)}
                  >
                    {agreements.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input
                  type="hidden"
                  name="agreementId"
                  value={agreement?.id ?? ""}
                />
              )}
              {agreement && agreement.kinds.length > 1 ? (
                <label>
                  Παροχή
                  <select
                    className="input"
                    name="kindId"
                    value={kindId}
                    onChange={(e) => handleKind(e.target.value)}
                  >
                    {agreement.kinds.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                kindId && <input type="hidden" name="kindId" value={kindId} />
              )}
            </>
          )}
          <label>
            Ημερομηνία
            <input
              className="input"
              type="date"
              name="date"
              min={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {isIsoDay(date) && (
              <span className="muted">{dayWithWeekday(date)}</span>
            )}
          </label>
          <label>
            Ώρα έναρξης
            <input
              className="input"
              type="time"
              name="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <DurationField
            duration={duration}
            freeHours={freeHours}
            onDuration={setDuration}
            onFreeHours={setFreeHours}
          />
          <input
            type="hidden"
            name="hours"
            value={Number.isFinite(hours) ? String(hours) : ""}
          />
          <label>
            Πού
            <input
              className="input"
              name="location"
              maxLength={200}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>
          <label>
            Σημείωση για το Συνεργείο
            <textarea
              className="input"
              name="note"
              rows={3}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {!isInternal && agreement && (
            <Availability agreement={agreement} kind={kind} hours={hours} />
          )}
          {isInternal && (
            <p className="muted">Το εσωτερικό Γύρισμα δεν μετράει Παροχή.</p>
          )}
          <SlotNotice date={date} time={start} hours={String(hours)} />
          {isPastDay(date, today) && (
            <p className="e-warn" role="alert">
              Η μέρα {fmtDate(date)} έχει περάσει. Έλεγξε την ημερομηνία πριν
              δημιουργήσεις το Γύρισμα.
            </p>
          )}
          {state.error && (
            <p className="e-warn" role="alert">
              {state.error}
            </p>
          )}
          <p className="muted">
            Το Συνεργείο ορίζεται μετά, στη σελίδα του Γυρίσματος. Ξεκινά
            «προγραμματισμένο» (δεν περνά από έγκριση).
          </p>
          <div className="btn-row e4-own-submit">
            <button
              type="submit"
              className="button"
              data-primary="true"
              disabled={isPending}
            >
              {isPending
                ? "Αποθήκευση…"
                : prefill
                  ? "Μετατροπή σε Γύρισμα"
                  : "Δημιουργία Γυρίσματος"}
            </button>
          </div>
        </div>
      </Panel>
    </form>
  );
}
