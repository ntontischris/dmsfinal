"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

import { bookFilming, bookInternalFilming } from "../actions-book";
import {
  DURATION_PRESETS,
  defaultHours,
  defaultKindId,
  isExtraBalance,
  balanceText,
} from "../helpers";
import { MEASURE_LABELS } from "../labels";
import type { BookingAgreement, BookingKind, NamedRef } from "../types";

import { ActionForm } from "./action-form";
import { DurationNotice } from "./duration-notice";
import { MutedNote } from "./form-fields";

export interface NewFilmingProps {
  options: readonly BookingAgreement[];
  productions: readonly NamedRef[];
  today: string;
}

type Mode = "client" | "internal";

// E4: κλείσιμο Γυρίσματος από την ομάδα. Πρώτα ο Πελάτης και η Συμφωνία, μετά ώρα, διάρκεια και Παροχή με το υπόλοιπό της.
// Η Εσωτερική Παραγωγή κλείνεται χωρίς Πελάτη και χωρίς Παροχή.
export function NewFilmingForm({
  options,
  productions,
  today,
}: NewFilmingProps) {
  const [mode, setMode] = useState<Mode>("client");
  return (
    <div className="grid gap-4">
      {productions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={mode === "client" ? "primary" : "ghost"}
            onClick={() => setMode("client")}
          >
            Πελάτης
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === "internal" ? "primary" : "ghost"}
            onClick={() => setMode("internal")}
          >
            Εσωτερική Παραγωγή
          </Button>
        </div>
      )}
      {mode === "client" ? (
        <ClientBookingForm options={options} today={today} />
      ) : (
        <InternalBookingForm productions={productions} today={today} />
      )}
    </div>
  );
}

function ClientBookingForm({
  options,
  today,
}: {
  options: readonly BookingAgreement[];
  today: string;
}) {
  const clients = uniqueClients(options);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const agreements = options.filter(
    (agreement) => agreement.client.id === clientId,
  );
  const [agreementId, setAgreementId] = useState(agreements[0]?.id ?? "");
  const agreement =
    agreements.find((item) => item.id === agreementId) ?? agreements[0];
  const [kindId, setKindId] = useState(defaultKindId(agreement?.kinds ?? []));
  const kind = agreement?.kinds.find((item) => item.id === kindId);
  const [hours, setHours] = useState(String(defaultHours(kind)));

  if (clients.length === 0) {
    return (
      <MutedNote>
        Δεν υπάρχει Συμφωνία που να μπορεί να κλείσει Γύρισμα αυτή τη στιγμή.
      </MutedNote>
    );
  }

  const pickClient = (value: string) => {
    const next = options.find((item) => item.client.id === value);
    setClientId(value);
    setAgreementId(next?.id ?? "");
    setKindId(defaultKindId(next?.kinds ?? []));
  };
  const pickAgreement = (value: string) => {
    const next = agreements.find((item) => item.id === value);
    setAgreementId(value);
    setKindId(defaultKindId(next?.kinds ?? []));
    setHours(String(defaultHours(next?.kinds[0])));
  };
  const pickKind = (value: string) => {
    setKindId(value);
    setHours(
      String(defaultHours(agreement?.kinds.find((item) => item.id === value))),
    );
  };

  return (
    <ActionForm
      action={bookFilming}
      submitLabel="Κλείσιμο Γυρίσματος"
      variant="primary"
    >
      <Field label="Πελάτης">
        <Select
          value={clientId}
          onChange={(event) => pickClient(event.target.value)}
        >
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Συμφωνία">
        <Select
          name="agreementId"
          value={agreement?.id ?? ""}
          onChange={(event) => pickAgreement(event.target.value)}
        >
          {agreements.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </Select>
      </Field>
      <DateTimeFields today={today} />
      <Field
        label="Διάρκεια (ώρες)"
        hint="2, 3 ή 4 ώρες, ή ελεύθερη τιμή από 0,5 έως 12 ανά μισή ώρα."
      >
        <div className="grid gap-2">
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map((preset) => (
              <Button
                key={preset}
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setHours(String(preset))}
              >
                {preset} ώρες
              </Button>
            ))}
          </div>
          <Input
            name="hours"
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0.5"
            max="12"
            required
            value={hours}
            onChange={(event) => setHours(event.target.value)}
          />
        </div>
      </Field>
      {agreement && agreement.kinds.length > 0 && (
        <Field label="Είδος Παροχής">
          <Select
            name="kindId"
            value={kindId}
            onChange={(event) => pickKind(event.target.value)}
          >
            {agreement.kinds.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {kind && <KindBalance kind={kind} />}
      {kind && (
        <DurationNotice
          hours={Number(hours.replace(",", "."))}
          measure={kind.measure}
          defaultHours={kind.defaultHours}
        />
      )}
      <Field label="Πού">
        <Input name="location" maxLength={200} />
      </Field>
      <Field label="Σημείωση Συνεργείου">
        <Input name="note" maxLength={500} />
      </Field>
    </ActionForm>
  );
}

function InternalBookingForm({
  productions,
  today,
}: {
  productions: readonly NamedRef[];
  today: string;
}) {
  return (
    <ActionForm
      action={bookInternalFilming}
      submitLabel="Κλείσιμο Γυρίσματος"
      variant="primary"
    >
      <Field label="Εσωτερική Παραγωγή">
        <Select name="productionId" required defaultValue="">
          <option value="" disabled>
            Διάλεξε Παραγωγή…
          </option>
          {productions.map((production) => (
            <option key={production.id} value={production.id}>
              {production.name}
            </option>
          ))}
        </Select>
      </Field>
      <DateTimeFields today={today} />
      <Field label="Διάρκεια (ώρες)">
        <Input
          name="hours"
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0.5"
          max="12"
          required
          defaultValue={3}
        />
      </Field>
      <Field label="Πού">
        <Input name="location" maxLength={200} />
      </Field>
      <Field label="Σημείωση Συνεργείου">
        <Input name="note" maxLength={500} />
      </Field>
      <MutedNote>Το εσωτερικό Γύρισμα δεν μετράει Παροχή.</MutedNote>
    </ActionForm>
  );
}

function DateTimeFields({ today }: { today: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Ημερομηνία">
        <Input
          name="date"
          type="date"
          required
          defaultValue={today}
          min={today}
        />
      </Field>
      <Field label="Ώρα">
        <Input name="time" type="time" required defaultValue="09:00" />
      </Field>
    </div>
  );
}

// Το υπόλοιπο του είδους, χωρίς ποσά· αν τελείωσε, το Γύρισμα μπαίνει ως έξτρα (προειδοποίηση, όχι μπλοκ).
// Το υπόλοιπο του είδους της τρέχουσας Περιόδου, χωρίς ποσά. Μια μέρα της επόμενης Περιόδου χρεώνεται σε εκείνη.
function KindBalance({ kind }: { kind: BookingKind }) {
  const extra = isExtraBalance(kind.balance);
  return (
    <div className="grid gap-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span>Υπόλοιπο τρέχουσας Περιόδου</span>
        <span className="text-muted-foreground">
          {MEASURE_LABELS[kind.measure]}
          {kind.balance !== null
            ? ` · ${balanceText(kind.balance)}`
            : " · χωρίς μέτρηση στην τρέχουσα Περίοδο"}
        </span>
        {extra && <Badge tone="attention">Έξτρα: η Παροχή τελείωσε</Badge>}
      </div>
      <MutedNote>Μέρα της επόμενης Περιόδου χρεώνεται σε εκείνη την Περίοδο.</MutedNote>
    </div>
  );
}

function uniqueClients(options: readonly BookingAgreement[]): NamedRef[] {
  const seen = new Map<string, NamedRef>();
  for (const option of options) seen.set(option.client.id, option.client);
  return [...seen.values()];
}
