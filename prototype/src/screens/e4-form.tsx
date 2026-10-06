"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import {
  BOOKING_HOURS,
  FILMING_RULES,
  PRODUCTIONS,
  type ProductionStub,
} from "@/data/filming";
import { capacityOf, takenAt } from "@/data/filming-access";
import {
  BalanceCard,
  balanceOfDay,
  balanceOfPeriod,
  lastLocationOf,
  periodOf,
  type PeriodBalance,
} from "@/screens/e4-model";
import { Badge, fmtDate } from "@/screens/shared";

import "./e5.css";

export interface E4Client {
  id: string;
  name: string;
  agreementId: string;
}

interface E4FormProps {
  clients: readonly E4Client[];
  productions: readonly ProductionStub[];
  fromBlocked: boolean;
  crewHref: string;
  blocked: BlockedSource;
}

// Ο Κλεισμένος χρόνος που μετατρέπεται (A6): η ώρα του προσυμπληρώνεται.
export interface BlockedSource {
  title: string;
  date: string;
  start: string;
  hours: number;
}
const FREE = "free";

// Στη μετατροπή, η Παραγωγή που διαλέγεται ορίζει την Περίοδο· η μέρα πρέπει να πέφτει μέσα της.
const blockedBalance = (
  agreementId: string,
  production: ProductionStub | undefined,
  date: string,
): PeriodBalance | null => {
  const period = periodOf(agreementId, date);
  return period && period.label === production?.periodLabel
    ? balanceOfPeriod(agreementId, period)
    : null;
};

interface AvailabilityProps {
  hasPeriod: boolean;
  balance: PeriodBalance | null;
  taken: number;
  capacity: number;
  fromBlocked: boolean;
  periodLabel: string | null;
}

function Availability({
  hasPeriod,
  balance,
  taken,
  capacity,
  fromBlocked,
  periodLabel,
}: AvailabilityProps) {
  if (!balance)
    return (
      <p className="e-warn" role="alert">
        {hasPeriod && fromBlocked
          ? `Η μέρα ανήκει σε άλλη Περίοδο από «${periodLabel ?? "—"}». Διάλεξε Παραγωγή της Περιόδου της μέρας.`
          : "Η μέρα δεν πέφτει σε καμία Περίοδο της Συμφωνίας (εκτός Συμφωνίας). Δεν μπορεί να δημιουργηθεί Γύρισμα εκτός Περιόδου· άλλαξε μέρα ή ανανέωσε τη Συμφωνία."}
      </p>
    );
  return (
    <>
      <div className="e-info">
        <strong>Σε ποια Παραγωγή μπαίνει:</strong> της Περιόδου της μέρας.
        <BalanceCard balance={balance} />
      </div>
      {balance.left <= 0 && (
        <p className="e-warn" role="alert">
          Θα είναι έξτρα και θα τιμολογηθεί με την τιμή της Υπηρεσίας στη
          Συμφωνία. Επιτρέπεται για την ομάδα.
        </p>
      )}
      <p className={taken >= capacity ? "e-warn" : "e-info"}>
        Χωρητικότητα εκείνη την ώρα: {taken} από {capacity} Γυρίσματα.
        {taken >= capacity &&
          " Είναι γεμάτη· η ομάδα μπορεί να την ξεπεράσει, αλλά έλεγξε το Συνεργείο και τον Εξοπλισμό."}
      </p>
    </>
  );
}

interface CreatedCardProps {
  clientName: string;
  date: string;
  start: string;
  hours: number;
  location: string;
  balance: PeriodBalance;
  crewHref: string;
}

function CreatedCard({
  clientName,
  date,
  start,
  hours,
  location,
  balance,
  crewHref,
}: CreatedCardProps) {
  return (
    <section className="card" role="status">
      <Badge tone="strong">προγραμματισμένο</Badge>
      <h2>Το Γύρισμα δημιουργήθηκε</h2>
      <p>
        {clientName} · {fmtDate(date)} {start} ({hours} ώρες) · {location}
      </p>
      <ul className="list">
        <li>
          Μπήκε στην Παραγωγή «{balance.production?.title ?? "—"}» και δέσμευσε
          1 Παροχή «Γύρισμα»{balance.left <= 0 && " (έξτρα: θα τιμολογηθεί)"}.
        </li>
        <li>
          Ξεκινά «προγραμματισμένο», χωρίς έγκριση: τον πελάτη τον έχετε ήδη
          συμφωνήσει μαζί του.
        </li>
        <li>Γράφτηκε το γεγονός στο Εταιρικό ημερολόγιο Google.</li>
        <li>
          Επόμενο βήμα:{" "}
          <Link href={crewHref}>ορίστε το Συνεργείο στο Γύρισμα (E3)</Link>.
        </li>
      </ul>
      <p className="muted">(prototype: δεν αποθηκεύεται)</p>
    </section>
  );
}

// Νέο Γύρισμα από την ομάδα: προγραμματισμένο χωρίς έγκριση (Q6), Παροχή από την Περίοδο της μέρας (Q9).
export function E4Form({
  clients,
  productions,
  fromBlocked,
  crewHref,
  blocked,
}: E4FormProps) {
  const first = clients[0];
  const [clientId, setClientId] = useState(first?.id ?? "");
  const [productionId, setProductionId] = useState(productions[0]?.id ?? "");
  const [date, setDate] = useState(
    fromBlocked ? blocked.date : "2026-10-05",
  );
  const [start, setStart] = useState(
    fromBlocked ? blocked.start : "10:00",
  );
  const [duration, setDuration] = useState(
    String(fromBlocked ? blocked.hours : BOOKING_HOURS.durations[0]),
  );
  const [freeHours, setFreeHours] = useState("5");
  const [location, setLocation] = useState(lastLocationOf(first?.id ?? ""));
  const [note, setNote] = useState("");
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [created, setCreated] = useState(false);

  const production = PRODUCTIONS.find((item) => item.id === productionId);
  const client = clients.find(
    (item) => item.id === (fromBlocked ? production?.clientId : clientId),
  );
  const hours = Number(duration === FREE ? freeHours : duration);
  const balance = !client
    ? null
    : fromBlocked
      ? blockedBalance(client.agreementId, production, date)
      : balanceOfDay(client.agreementId, date);
  const hasPeriod = !!client && !!periodOf(client.agreementId, date);
  const taken = takenAt(date, start, hours > 0 ? hours : 1);
  const capacity = capacityOf(date);
  const isIncomplete = !location.trim() || !(hours > 0) || !date;

  const handleClient = (id: string) => {
    setClientId(id);
    setLocation(lastLocationOf(id));
  };
  const handleProduction = (id: string) => {
    setProductionId(id);
    const next = PRODUCTIONS.find((item) => item.id === id);
    setLocation(lastLocationOf(next?.clientId ?? ""));
  };
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setTriedSubmit(true);
    if (!balance || isIncomplete) return;
    setCreated(true);
  };

  if (created && client && balance)
    return (
      <CreatedCard
        clientName={client.name}
        date={date}
        start={start}
        hours={hours}
        location={location}
        balance={balance}
        crewHref={crewHref}
      />
    );

  return (
    <form className="card e-form" onSubmit={handleSubmit} noValidate>
      <h2>{fromBlocked ? "Μετατροπή από Κλεισμένο χρόνο" : "Στοιχεία"}</h2>
      {fromBlocked && (
        <p className="e-info">
          Από τον Κλεισμένο χρόνο «{blocked.title}» (
          {fmtDate(blocked.date)} {blocked.start}). Η ώρα έχει
          προσυμπληρωθεί· διάλεξε σε ποια Παραγωγή μπαίνει. Απαιτεί «Κλείνει
          Γύρισμα». Με τη μετατροπή ο Κλεισμένος χρόνος σβήνει για όλα τα
          άτομά του και το ίδιο γεγονός του Google γίνεται το Γύρισμα, χωρίς
          διπλό. Τα άτομα δεν μπαίνουν μόνα τους στο Συνεργείο.
        </p>
      )}
      {fromBlocked ? (
        <label>
          Παραγωγή
          <select
            className="input"
            value={productionId}
            onChange={(e) => handleProduction(e.target.value)}
          >
            {productions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      ) : (
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
      )}
      <label>
        Ημερομηνία
        <input
          className="input"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label>
        Ώρα έναρξης
        <input
          className="input"
          type="time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <div className="e-field">
        Διάρκεια
        <div className="btn-row">
          {[...BOOKING_HOURS.durations.map(String), FREE].map((value) => (
            <button
              key={value}
              type="button"
              className="button e-pick"
              aria-pressed={duration === value}
              onClick={() => setDuration(value)}
            >
              {value === FREE ? "Άλλη διάρκεια" : `${value} ώρες`}
            </button>
          ))}
        </div>
        {duration === FREE && (
          <input
            className="input"
            type="number"
            min={1}
            max={12}
            step={0.5}
            aria-label="Ώρες"
            value={freeHours}
            onChange={(e) => setFreeHours(e.target.value)}
          />
        )}
        <span className="muted">
          Η ομάδα δεν περιορίζεται στις επιτρεπτές διάρκειες του πελάτη.
        </span>
      </div>
      <label>
        Πού
        <input
          className="input"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <span className="muted">
          Προσυμπληρώθηκε από προηγούμενο Γύρισμα του πελάτη.
        </span>
      </label>
      <label>
        Σημείωση για το Συνεργείο
        <textarea
          className="input"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      <Availability
        hasPeriod={hasPeriod}
        balance={balance}
        taken={taken}
        capacity={capacity}
        fromBlocked={fromBlocked}
        periodLabel={production?.periodLabel ?? null}
      />
      {triedSubmit && isIncomplete && (
        <p className="e-warn" role="alert">
          Συμπλήρωσε μέρα, διάρκεια και τόπο.
        </p>
      )}
      <p className="muted">
        Το Συνεργείο ορίζεται μετά, στο Γύρισμα (E3). Ξεκινά «προγραμματισμένο»
        {FILMING_RULES.needsApproval ? " (δεν περνά από έγκριση)" : ""}.
      </p>
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary="true"
          disabled={!balance}
        >
          {fromBlocked ? "Μετατροπή σε Γύρισμα" : "Δημιουργία Γυρίσματος"}
        </button>
      </div>
    </form>
  );
}
