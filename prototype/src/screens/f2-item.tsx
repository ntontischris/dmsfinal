"use client";

import { useState } from "react";

import {
  EQUIPMENT_CATEGORIES,
  categoryName,
  type EquipmentItem,
  type EquipmentStatus,
} from "@/data/equipment";
import {
  isUpcoming,
  reservationsOf,
  type EquipmentCaps,
} from "@/data/equipment-access";
import { FILMINGS, NOW } from "@/data/filming";
import type { RoleId } from "@/data/roles";
import { ReasonForm } from "@/screens/e3-ui";
import { F2Reservations } from "@/screens/f2-reservations";
import { statusTone } from "@/screens/f-model";
import { Badge } from "@/screens/shared";

interface F2ItemProps {
  role: RoleId;
  caps: EquipmentCaps;
  initial: EquipmentItem;
}

type Pending = "repair" | "retire" | "edit" | "delete" | null;

const findFilmingById = (id: string) => FILMINGS.find((f) => f.id === id);

// Η σελίδα στη μνήμη: το αντικείμενο και ποια Γυρίσματα το έχουν δεσμευμένο.
export function F2Item({ role, caps, initial }: F2ItemProps) {
  const [item, setItem] = useState(initial);
  const [holderIds, setHolderIds] = useState<readonly string[]>(
    reservationsOf(initial.id).map((filming) => filming.id),
  );
  const [pending, setPending] = useState<Pending>(null);
  const [isDeleted, setIsDeleted] = useState(false);

  const log = (text: string) => ({ when: NOW.slice(0, 10), by: "εσύ", text });
  const changeStatus = (
    status: EquipmentStatus,
    reason: string,
    extra = "",
  ) => {
    setItem((current) => ({
      ...current,
      status,
      statusNote: reason || undefined,
      history: [
        ...current.history,
        log(
          `${status === "διαθέσιμο" ? "Διαθέσιμο ξανά" : status === "σε επισκευή" ? "Σε επισκευή" : "Αποσύρθηκε"}${reason ? `: ${reason}` : ""}.${extra}`,
        ),
      ],
    }));
    setPending(null);
  };
  const upcomingHolders = holderIds
    .map(findFilmingById)
    .filter((filming) => !!filming && isUpcoming(filming));

  const handleRetire = (reason: string) => {
    const released = upcomingHolders.length;
    setHolderIds((current) =>
      current.filter((id) => !upcomingHolders.some((f) => f?.id === id)),
    );
    changeStatus(
      "αποσυρμένο",
      reason,
      released > 0
        ? ` Αποδεσμεύτηκε από ${released} μελλοντικά Γυρίσματα.`
        : "",
    );
  };

  if (isDeleted)
    return (
      <section className="card notice" role="status">
        <h2>Διαγράφηκε: {item.name}</h2>
        <p className="muted">Δεν είχε δεσμευτεί ποτέ, οπότε δεν άφησε ίχνος.</p>
      </section>
    );

  return (
    <>
      <section className="card">
        <div className="card-title">
          <h2>{item.name}</h2>
          <Badge tone={statusTone(item.status)}>{item.status}</Badge>
        </div>
        <dl className="dl">
          <dt>Κατηγορία</dt>
          <dd>{categoryName(item.categoryId)}</dd>
          <dt>Κωδικός</dt>
          <dd>{item.code ?? "—"}</dd>
          <dt>Σημείωση</dt>
          <dd>{item.note ?? "—"}</dd>
          {item.statusNote && (
            <>
              <dt>Λόγος κατάστασης</dt>
              <dd>{item.statusNote}</dd>
            </>
          )}
        </dl>
        {caps.canManageStock ? (
          <StockActions
            item={item}
            pending={pending}
            setPending={setPending}
            futureHolds={upcomingHolders.length}
            canDelete={holderIds.length === 0}
            onRepair={(reason) => changeStatus("σε επισκευή", reason)}
            onAvailable={() => changeStatus("διαθέσιμο", "")}
            onRetire={handleRetire}
            onEdit={(changes) => {
              setItem((current) => ({
                ...current,
                ...changes,
                history: [...current.history, log("Άλλαξαν τα στοιχεία.")],
              }));
              setPending(null);
            }}
            onDelete={() => setIsDeleted(true)}
          />
        ) : (
          <p className="muted">
            Μόνο ανάγνωση: το μητρώο το αλλάζει όποιος «Διαχειρίζεται απόθεμα».
          </p>
        )}
      </section>
      <F2Reservations
        role={role}
        caps={caps}
        item={item}
        holderIds={holderIds}
        onChange={(ids, text) => {
          setHolderIds(ids);
          setItem((current) => ({
            ...current,
            history: [...current.history, log(text)],
          }));
        }}
      />
      <section className="card">
        <div className="card-title">
          <h2>Ιστορικό</h2>
        </div>
        <ul className="list">
          {[...item.history].reverse().map((event, index) => (
            <li key={index}>
              <span className="muted">
                {event.when} · {event.by}
              </span>{" "}
              {event.text}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

interface StockActionsProps {
  item: EquipmentItem;
  pending: Pending;
  setPending: (pending: Pending) => void;
  futureHolds: number;
  canDelete: boolean;
  onRepair: (reason: string) => void;
  onAvailable: () => void;
  onRetire: (reason: string) => void;
  onEdit: (changes: Partial<EquipmentItem>) => void;
  onDelete: () => void;
}

function StockActions(props: StockActionsProps) {
  const { item, pending, setPending, futureHolds, canDelete } = props;
  if (pending === "repair")
    return (
      <>
        {futureHolds > 0 && (
          <p className="e-warn">
            Έχει {futureHolds} μελλοντικές Δεσμεύσεις. Μένουν, με σήμα στο
            Γύρισμα, ώστε να αποφασίσεις αν θα επιστρέψει εγκαίρως.
          </p>
        )}
        <ReasonForm
          label="Τι έπαθε και πότε επιστρέφει (υποχρεωτικό)"
          confirmLabel="Σε επισκευή"
          onConfirm={props.onRepair}
          onClose={() => setPending(null)}
        />
      </>
    );
  if (pending === "retire")
    return (
      <>
        <p className="e-warn">
          Η απόσυρση είναι για πάντα (πουλήθηκε, χάθηκε, χάλασε).{" "}
          {futureHolds > 0
            ? `Αποδεσμεύεται αυτόματα από ${futureHolds} μελλοντικά Γυρίσματα. `
            : ""}
          Τα παλιά Γυρίσματα το κρατούν στο ιστορικό τους.
        </p>
        <ReasonForm
          label="Λόγος (προαιρετικός)"
          confirmLabel="Απόσυρση"
          isDanger
          isOptional
          onConfirm={props.onRetire}
          onClose={() => setPending(null)}
        />
      </>
    );
  if (pending === "edit")
    return (
      <EditForm
        item={item}
        onSave={props.onEdit}
        onCancel={() => setPending(null)}
      />
    );
  if (pending === "delete")
    return (
      <div className="btn-row">
        <span className="muted">
          Δεν δεσμεύτηκε ποτέ, οπότε σβήνεται εντελώς.
        </span>
        <button
          type="button"
          className="button"
          data-danger="true"
          onClick={props.onDelete}
        >
          Ναι, διαγραφή
        </button>
        <button
          type="button"
          className="button"
          onClick={() => setPending(null)}
        >
          Άκυρο
        </button>
      </div>
    );
  return (
    <div className="btn-row">
      <button
        type="button"
        className="button"
        onClick={() => setPending("edit")}
      >
        Αλλαγή στοιχείων
      </button>
      {item.status === "διαθέσιμο" && (
        <button
          type="button"
          className="button"
          onClick={() => setPending("repair")}
        >
          Σε επισκευή
        </button>
      )}
      {item.status !== "διαθέσιμο" && (
        <button type="button" className="button" onClick={props.onAvailable}>
          Διαθέσιμο ξανά
        </button>
      )}
      {item.status !== "αποσυρμένο" &&
        (canDelete ? (
          <button
            type="button"
            className="button"
            data-danger="true"
            onClick={() => setPending("delete")}
          >
            Διαγραφή
          </button>
        ) : (
          <button
            type="button"
            className="button"
            data-danger="true"
            onClick={() => setPending("retire")}
          >
            Απόσυρση
          </button>
        ))}
    </div>
  );
}

function EditForm({
  item,
  onSave,
  onCancel,
}: {
  item: EquipmentItem;
  onSave: (changes: Partial<EquipmentItem>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [code, setCode] = useState(item.code ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const categories = EQUIPMENT_CATEGORIES.filter(
    (category) => !category.isRetired || category.id === item.categoryId,
  );
  return (
    <div className="e-form">
      <label>
        Όνομα (υποχρεωτικό)
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Κατηγορία
        <select
          className="select"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Κωδικός ή σειριακός
        <input
          className="input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <label>
        Σημείωση
        <input
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
      <p className="muted">
        Η αλλαγή ονόματος φαίνεται παντού, και στα παλιά Γυρίσματα: είναι το
        ίδιο αντικείμενο.
      </p>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          data-primary="true"
          disabled={!name.trim()}
          onClick={() =>
            onSave({
              name: name.trim(),
              categoryId,
              code: code.trim() || undefined,
              note: note.trim() || undefined,
            })
          }
        >
          Αποθήκευση
        </button>
        <button type="button" className="button" onClick={onCancel}>
          Άκυρο
        </button>
      </div>
    </div>
  );
}
