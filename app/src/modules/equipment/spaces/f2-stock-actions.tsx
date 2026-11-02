"use client";

import { useState } from "react";

import { LastDone, ReasonForm } from "./f-ui";

import { deleteItem, setItemStatus, updateItem } from "../actions-items";
import type { EquipmentCategory, EquipmentItemDetail } from "../types";
import { countLabel } from "./f-model";
import { useRunAction } from "./f-run";

type Pending = "repair" | "retire" | "edit" | "delete" | null;

interface StockActionsProps {
  item: EquipmentItemDetail;
  categories: readonly EquipmentCategory[];
  holdLabels: readonly string[]; // οι μελλοντικές Δεσμεύσεις, ως ετικέτες
  replacements: readonly string[]; // ονόματα διαθέσιμων της ίδιας Κατηγορίας
  canDelete: boolean;
}

const futureLabel = (count: number): string =>
  countLabel(count, "μελλοντικό Γύρισμα", "μελλοντικά Γυρίσματα");

// Οι ενέργειες όποιου «Διαχειρίζεται απόθεμα» (prototype `f2-item.tsx` › StockActions), πάνω στα πραγματικά actions.
export function StockActions(props: StockActionsProps) {
  const { item, holdLabels, canDelete } = props;
  const [pending, setPending] = useState<Pending>(null);
  const { isPending, last, run } = useRunAction();
  const close = () => setPending(null);
  const setStatus = (status: string, note: string) =>
    run(setItemStatus, { itemId: item.id, status, note }, close);
  const futureHolds = holdLabels.length;
  const message = last.error ?? last.notice;
  const feedback = (
    <LastDone
      log={message ? [message] : []}
      tone={last.error ? "error" : "ok"}
    />
  );

  if (pending === "repair")
    return (
      <>
        {futureHolds > 0 && (
          <div className="e-warn">
            <p>
              Δηλώνεις βλάβη για: <strong>{item.name}</strong>. Είναι δεσμευμένο
              σε {futureLabel(futureHolds)}: {holdLabels.join(", ")}. Οι
              Δεσμεύσεις μένουν, με σήμα στο Γύρισμα.
            </p>
            <p>
              {props.replacements.length > 0
                ? `Τι να κάνεις μετά: άνοιξε το Γύρισμα από τις Μελλοντικές Δεσμεύσεις (πιο κάτω) και αντικατάστησέ το με ${props.replacements.join(" ή ")}, ή ενημέρωσε το Συνεργείο.`
                : "Τι να κάνεις μετά: δεν υπάρχει διαθέσιμο αντικείμενο της ίδιας Κατηγορίας· ενημέρωσε το Συνεργείο από το Γύρισμα (Μελλοντικές Δεσμεύσεις, πιο κάτω)."}
            </p>
          </div>
        )}
        <ReasonForm
          label="Τι έπαθε και πότε επιστρέφει (υποχρεωτικό)"
          confirmLabel="Σε επισκευή"
          isPending={isPending}
          onConfirm={(reason) => setStatus("in_repair", reason)}
          onClose={close}
        />
        {feedback}
      </>
    );
  if (pending === "retire")
    return (
      <>
        <p className="e-warn">
          Η απόσυρση είναι για πάντα (πουλήθηκε, χάθηκε, χάλασε).{" "}
          {futureHolds > 0
            ? `Αποδεσμεύεται αυτόματα από ${futureLabel(futureHolds)}. `
            : ""}
          Τα παλιά Γυρίσματα το κρατούν στο ιστορικό τους.
        </p>
        <ReasonForm
          label="Λόγος (προαιρετικός)"
          confirmLabel="Απόσυρση"
          isDanger
          isOptional
          isPending={isPending}
          onConfirm={(reason) => setStatus("retired", reason)}
          onClose={close}
        />
        {feedback}
      </>
    );
  if (pending === "edit")
    return (
      <>
        <EditForm
          item={item}
          categories={props.categories}
          isPending={isPending}
          onSave={(changes) =>
            run(updateItem, { itemId: item.id, ...changes }, close)
          }
          onCancel={close}
        />
        {feedback}
      </>
    );
  if (pending === "delete")
    return (
      <>
        <div className="btn-row">
          <span className="muted">
            Δεν δεσμεύτηκε ποτέ, οπότε σβήνεται εντελώς.
          </span>
          <button
            type="button"
            className="button"
            data-danger="true"
            disabled={isPending}
            onClick={() => run(deleteItem, { itemId: item.id })}
          >
            Ναι, διαγραφή
          </button>
          <button type="button" className="button" onClick={close}>
            Άκυρο
          </button>
        </div>
        {feedback}
      </>
    );
  return (
    <>
      <div className="btn-row">
        <button
          type="button"
          className="button"
          onClick={() => setPending("edit")}
        >
          Αλλαγή στοιχείων
        </button>
        {item.status === "available" && (
          <button
            type="button"
            className="button"
            onClick={() => setPending("repair")}
          >
            Σε επισκευή
          </button>
        )}
        {item.status !== "available" && (
          <button
            type="button"
            className="button"
            disabled={isPending}
            onClick={() => setStatus("available", "")}
          >
            Διαθέσιμο ξανά
          </button>
        )}
        {item.status !== "retired" &&
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
      {feedback}
    </>
  );
}

interface ItemChanges {
  name: string;
  categoryId: string;
  code: string;
  note: string;
}

function EditForm({
  item,
  categories,
  isPending,
  onSave,
  onCancel,
}: {
  item: EquipmentItemDetail;
  categories: readonly EquipmentCategory[];
  isPending: boolean;
  onSave: (changes: ItemChanges) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [categoryId, setCategoryId] = useState(item.categoryId);
  const [code, setCode] = useState(item.code ?? "");
  const [note, setNote] = useState(item.note ?? "");
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
          disabled={!name.trim() || isPending}
          onClick={() =>
            onSave({
              name: name.trim(),
              categoryId,
              code: code.trim(),
              note: note.trim(),
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
