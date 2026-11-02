import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { STATUS_LABELS } from "../labels";
import type { EquipmentCategory, EquipmentItemDetail } from "../types";
import type { CandidateView, HistoryRow, ReservationView } from "./f-adapter";
import { statusTone } from "./f-model";
import { F2Reservations, type ReservationsAccess } from "./f2-reservations";
import { StockActions } from "./f2-stock-actions";

export interface F2ItemProps {
  item: EquipmentItemDetail;
  canManage: boolean;
  categories: readonly EquipmentCategory[]; // όσες διαλέγονται στην αλλαγή στοιχείων
  replacements: readonly string[];
  reservations: readonly ReservationView[];
  conflicts: readonly { a: ReservationView; b: ReservationView }[];
  candidates: readonly CandidateView[];
  history: readonly HistoryRow[];
  access: ReservationsAccess;
}

// Η σελίδα του αντικειμένου (prototype `f2-item.tsx`): στοιχεία, ενέργειες αποθέματος, Δεσμεύσεις, Ιστορικό.
// Η κατάσταση ζει στη βάση· μετά από κάθε ενέργεια η σελίδα ξαναδιαβάζεται.
export function F2Item(props: F2ItemProps) {
  const { item, reservations } = props;
  const upcoming = reservations.filter((view) => view.isUpcoming);
  return (
    <>
      <Panel
        label={item.name}
        aside={
          <>
            <span className="btn-row">
              <Badge tone={statusTone(item.status)}>
                {STATUS_LABELS[item.status]}
              </Badge>
            </span>
          </>
        }
      >
        <dl className="dl">
          <dt>Κατηγορία</dt>
          <dd>{item.categoryName}</dd>
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
        {props.canManage ? (
          <StockActions
            item={item}
            categories={props.categories}
            holdLabels={upcoming.map((view) => view.label)}
            replacements={props.replacements}
            canDelete={item.templates.length === 0 && reservations.length === 0}
          />
        ) : (
          <p className="note">
            Χάλασε κάτι; Πες το σε όποιον «Διαχειρίζεται απόθεμα»: αυτός το
            βάζει «σε επισκευή», ώστε να μην το πάρει κανείς σε Γύρισμα. Το
            μητρώο το αλλάζει μόνο εκείνος.
          </p>
        )}
      </Panel>
      <F2Reservations
        itemId={item.id}
        status={item.status}
        statusLabel={STATUS_LABELS[item.status]}
        replacements={props.replacements}
        reservations={reservations}
        conflicts={props.conflicts}
        candidates={props.candidates}
        access={props.access}
      />
      <Panel label="Ιστορικό">
        <RowList>
          {props.history.map((event) => (
            <ListRow
              key={event.key}
              lead={event.when}
              title={event.text}
              sub={event.by}
            />
          ))}
        </RowList>
      </Panel>
    </>
  );
}
