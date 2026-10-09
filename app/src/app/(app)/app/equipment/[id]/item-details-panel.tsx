import { Panel } from "@/components/ui/panel";
import { formatDateTime, type EquipmentItemDetail } from "@/modules/equipment";

// Τα στοιχεία του αντικειμένου, όπως φαίνονται σε όλους όσοι βλέπουν τον Εξοπλισμό.
export function ItemDetailsPanel({ item }: { item: EquipmentItemDetail }) {
  return (
    <Panel label="Στοιχεία">
      <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="kit-label">Κατηγορία</dt>
        <dd className="m-0">
          {item.categoryName}
          {item.categoryRetired && " (αποσυρμένη)"}
        </dd>
        <dt className="kit-label">Κωδικός</dt>
        <dd className="m-0">{item.code ?? "—"}</dd>
        <dt className="kit-label">Σημείωση</dt>
        <dd className="m-0">{item.note ?? "—"}</dd>
        <dt className="kit-label">Ενημερώθηκε</dt>
        <dd className="m-0">
          {formatDateTime(item.updatedAt)}
          {item.updatedByName ? ` · ${item.updatedByName}` : ""}
        </dd>
      </dl>
    </Panel>
  );
}
