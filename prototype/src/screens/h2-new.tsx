"use client";

import Link from "next/link";
import { useState } from "react";

import type { KindRow } from "@/screens/h2-context";
import { TODAY, addBusinessDays, type PersonOption } from "@/screens/h2-model";
import { fmtDate } from "@/screens/shared";

export interface NewFilming {
  id: string;
  date: string;
  isDone: boolean;
  state: string;
}

export interface H2NewProps {
  production: { id: string; title: string; isInternal: boolean; href: string };
  kinds: readonly KindRow[];
  people: readonly PersonOption[];
  filmings: readonly NewFilming[];
  deadlineDays: Readonly<Record<string, number | undefined>>;
  canSeeAmounts: boolean;
  defaultAssigneeId: string;
}

type Extra = "" | "με χρέωση" | "χωρίς χρέωση";

// Προτεινόμενη προθεσμία (κανόνας 6): από το Γύρισμα που έγινε, αλλιώς από σήμερα· πριν γίνει το Γύρισμα δεν υπάρχει ημερομηνία.
const suggestDeadline = (
  days: number,
  filming: NewFilming | undefined,
): string | null => {
  if (!filming) return addBusinessDays(TODAY, days);
  return filming.isDone ? addBusinessDays(filming.date, days) : null;
};

function KindCounter({ row }: { row: KindRow | undefined }) {
  if (!row) return null;
  if (row.total === null)
    return <p className="muted">Εσωτερική Παραγωγή: δεν υπάρχει Παροχή.</p>;
  const left = Math.max(0, row.total - row.used);
  return (
    <p className="muted">
      Παροχή της Περιόδου: σύνολο {row.total} · χρησιμοποιήθηκαν {row.used} ·
      απομένουν {left}
    </p>
  );
}

function ExtraChoice({
  canSeeAmounts,
  extra,
  setExtra,
  reason,
  setReason,
}: {
  canSeeAmounts: boolean;
  extra: Extra;
  setExtra: (value: Extra) => void;
  reason: string;
  setReason: (value: string) => void;
}) {
  return (
    <div className="h2-warn" role="alert">
      <p>
        Δεν μένει Παροχή αυτού του είδους στην Περίοδο. Διάλεξε πώς μπαίνει το
        Παραδοτέο.
      </p>
      <label className="h2-choice">
        <span>
          <input
            type="radio"
            name="extra"
            checked={extra === "με χρέωση"}
            onChange={() => setExtra("με χρέωση")}
          />{" "}
          Έξτρα με χρέωση (γεννά Τιμολογητέο
          {canSeeAmounts ? "· το ποσό ορίζεται εκεί" : ""})
        </span>
        <span>
          <input
            type="radio"
            name="extra"
            checked={extra === "χωρίς χρέωση"}
            onChange={() => setExtra("χωρίς χρέωση")}
          />{" "}
          Χωρίς χρέωση (απαιτεί λόγο)
        </span>
      </label>
      {extra === "χωρίς χρέωση" && (
        <input
          className="input"
          aria-label="Λόγος"
          placeholder="Λόγος (υποχρεωτικός)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      )}
    </div>
  );
}

export function H2New(props: H2NewProps) {
  const { production, kinds, people, filmings, deadlineDays } = props;
  const [title, setTitle] = useState("");
  const [kindId, setKindId] = useState(kinds[0]?.kindId ?? "");
  const [assigneeId, setAssigneeId] = useState(props.defaultAssigneeId);
  const [filmingId, setFilmingId] = useState(filmings[0]?.id ?? "");
  const [override, setOverride] = useState<string | null>(null);
  const [extra, setExtra] = useState<Extra>("");
  const [reason, setReason] = useState("");
  const [isCreated, setIsCreated] = useState(false);
  const row = kinds.find((k) => k.kindId === kindId);
  const filming = filmings.find((f) => f.id === filmingId);
  const suggested = suggestDeadline(deadlineDays[kindId] ?? 5, filming);
  const deadline = override ?? suggested;
  const isShort = !!row && row.total !== null && row.total - row.used <= 0;
  const extraOk =
    !isShort ||
    extra === "με χρέωση" ||
    (extra === "χωρίς χρέωση" && reason.trim() !== "");
  const isValid = title.trim() !== "" && kindId !== "" && extraOk;
  return (
    <section className="card h2">
      <div className="card-title">
        <h1>Νέο Παραδοτέο</h1>
        <Link href={production.href}>{production.title}</Link>
      </div>
      <div className="h2-form">
        <label>
          Τίτλος
          <input
            className="input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Είδος Παροχής
          <select
            className="select"
            value={kindId}
            onChange={(event) => setKindId(event.target.value)}
          >
            {kinds.map((k) => (
              <option key={k.kindId} value={k.kindId}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        <KindCounter row={row} />
        {isShort && (
          <ExtraChoice
            canSeeAmounts={props.canSeeAmounts}
            extra={extra}
            setExtra={setExtra}
            reason={reason}
            setReason={setReason}
          />
        )}
        <label>
          Ανατεθειμένος
          <select
            className="select"
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Γύρισμα (προαιρετικό)
          <select
            className="select"
            value={filmingId}
            onChange={(event) => {
              setFilmingId(event.target.value);
              setOverride(null);
            }}
          >
            <option value="">Χωρίς Γύρισμα (μετρά από τη δημιουργία)</option>
            {filmings.map((f) => (
              <option key={f.id} value={f.id}>
                {fmtDate(f.date)} · {f.state}
              </option>
            ))}
          </select>
        </label>
        <label>
          Προθεσμία (προτεινόμενη)
          <input
            className="input"
            type="date"
            value={deadline ?? ""}
            onChange={(event) => setOverride(event.target.value)}
          />
        </label>
        {!deadline && filming && (
          <span className="muted">
            Μετά το Γύρισμα της {fmtDate(filming.date).slice(0, 5)}: χωρίς
            ημερομηνία, δεν αργεί ποτέ μέχρι να γίνει.
          </span>
        )}
        <div className="btn-row">
          <button
            type="button"
            className="button"
            data-primary
            disabled={!isValid}
            onClick={() => setIsCreated(true)}
          >
            Δημιουργία Παραδοτέου
          </button>
        </div>
        {isCreated && (
          <p className="h2-memo" role="status">
            Δημιουργήθηκε «{title.trim()}». Ειδοποιείται: ο Ανατεθειμένος.
            {extra ? ` Έξτρα ${extra}.` : ""}
          </p>
        )}
        <span className="muted">(prototype: δεν αποθηκεύεται)</span>
      </div>
    </section>
  );
}
