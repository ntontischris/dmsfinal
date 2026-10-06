"use client";

import { useState } from "react";

import { provisionsOf, type AgreementRecord } from "@/data/agreements";
import { provisionKind, type ProvisionKindId } from "@/data/catalogue";
import { TODAY } from "@/data/sales";
import { signOutside, type Change } from "@/screens/d2-transitions";
import { NumberInput } from "@/screens/d2-ui";
import { fmtDate } from "@/screens/shared";

interface OutsideProps {
  draft: AgreementRecord;
  act: (change: Change, notice: string) => void;
}

type Used = Partial<Record<ProvisionKindId, number>>;

function UsedInputs({
  draft,
  used,
  onChange,
}: {
  draft: AgreementRecord;
  used: Used;
  onChange: (used: Used) => void;
}) {
  return (
    <span className="stack">
      <span className="muted">
        Η έναρξη είναι παλιά: ανοίγει μόνο η τρέχουσα Περίοδος και γράφεις πόσες
        Παροχές έχουν ήδη χρησιμοποιηθεί.
      </span>
      {provisionsOf(draft).map((p) => (
        <NumberInput
          key={p.kindId}
          label={`Ήδη χρησιμοποιήθηκαν ${provisionKind(p.kindId).unit}`}
          value={used[p.kindId] ?? 0}
          max={p.quantity}
          onChange={(v) => onChange({ ...used, [p.kindId]: v })}
          suffix={`από ${p.quantity} ${provisionKind(p.kindId).unit}, ήδη χρησιμοποιήθηκαν`}
        />
      ))}
    </span>
  );
}

// «Υπογράφηκε εκτός συστήματος»: αρχείο, ημερομηνία υπογραφής και έναρξη, που μπορεί να είναι στο παρελθόν.
export function OutsideSignatureForm({ draft, act }: OutsideProps) {
  const isMonthly = draft.kind === "μηνιαία";
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState("");
  const [by, setBy] = useState(
    draft.recipients.find((r) => r.isSignatory)?.name ?? "",
  );
  const [when, setWhen] = useState(TODAY);
  const [start, setStart] = useState(draft.start ?? TODAY);
  const [used, setUsed] = useState<Used>({});
  const [isInvoiced, setIsInvoiced] = useState(false);
  if (!isOpen)
    return (
      <button type="button" className="button" onClick={() => setIsOpen(true)}>
        Υπογράφηκε εκτός συστήματος
      </button>
    );
  const startIso = start;
  const isOldStart = isMonthly && startIso < `${TODAY.slice(0, 7)}-01`;
  const record = () =>
    act(
      signOutside({
        file,
        when,
        start: startIso,
        by: by.trim(),
        used: isOldStart ? used : {},
      }),
      `Καταχωρίστηκε υπογραφή εκτός συστήματος (${file}) στις ${fmtDate(when)}, με έναρξη ${fmtDate(startIso)}. Οι Σύνδεσμοι πρότασης έληξαν.${isOldStart && isInvoiced ? " Η τρέχουσα Περίοδος δεν γεννά Τιμολογητέο: τιμολογήθηκε ήδη εκτός συστήματος." : ""} Ο Υπογράφων προσκαλείται ως Χρήστης πελάτη.`,
    );
  return (
    <fieldset className="d2-form">
      <legend>Υπογράφηκε εκτός συστήματος</legend>
      <label className="stack">
        <span className="muted">Υπογεγραμμένο αρχείο</span>
        <input
          className="input"
          placeholder="symfonia-ypogegrammeni.pdf"
          value={file}
          onChange={(e) => setFile(e.target.value)}
        />
      </label>
      <label className="stack">
        <span className="muted">Ποιος υπέγραψε</span>
        <input
          className="input"
          value={by}
          onChange={(e) => setBy(e.target.value)}
        />
      </label>
      <label className="stack">
        <span className="muted">Ημερομηνία υπογραφής</span>
        <input
          className="input"
          type="date"
          value={when}
          onChange={(e) => setWhen(e.target.value || TODAY)}
        />
      </label>
      <label className="stack">
        <span className="muted">Έναρξη (οποιαδήποτε ημερομηνία, και στο παρελθόν)</span>
        <input
          className="input"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value || start)}
        />
      </label>
      {isOldStart && (
        <>
          <UsedInputs draft={draft} used={used} onChange={setUsed} />
          <label className="row">
            <input
              type="checkbox"
              checked={isInvoiced}
              onChange={(e) => setIsInvoiced(e.target.checked)}
            />
            <span>Ο τρέχων μήνας έχει ήδη τιμολογηθεί εκτός συστήματος</span>
          </label>
        </>
      )}
      <span className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          disabled={!file.trim() || !by.trim()}
          onClick={record}
        >
          Καταχώριση
        </button>
        <button
          type="button"
          className="button"
          onClick={() => setIsOpen(false)}
        >
          Άκυρο
        </button>
      </span>
    </fieldset>
  );
}
