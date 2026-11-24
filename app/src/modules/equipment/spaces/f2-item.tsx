import type { ReactNode } from "react";

import { Badge } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { STATUS_LABELS } from "../labels";
import type { EquipmentCategory, EquipmentItemDetail } from "../types";
import type { CandidateView, HistoryRow, ReservationView } from "./f-adapter";
import { FBox } from "./f-box";
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
  picker: ReactNode; // η αναζήτηση άλλου αντικειμένου, κάτω από την κεφαλή
}

// Η κεφαλή: όνομα (h1) και Κατάσταση· από κάτω οι ενέργειες αποθέματος (οι φόρμες τους ανοίγουν εκεί, όχι στην κεφαλή). Είναι `section`, ώστε να βρίσκεται από το όνομα.
function Hero(props: F2ItemProps) {
  const { item, reservations } = props;
  const upcoming = reservations.filter((view) => view.isUpcoming);
  return (
    <section>
      <header className="ml-hero">
        <span className="ml-hero-mono" aria-hidden="true">
          {initialsOf(item.name)}
        </span>
        <div>
          <Badge tone={statusTone(item.status)}>
            {STATUS_LABELS[item.status]}
          </Badge>
          <h1>{item.name}</h1>
          <p>{[item.categoryName, item.code].filter(Boolean).join(" · ")}</p>
          {item.statusNote && <p>Λόγος κατάστασης: {item.statusNote}</p>}
        </div>
      </header>
      <div className="f-hero-actions">
        {props.canManage ? (
          <StockActions
            item={item}
            categories={props.categories}
            holdLabels={upcoming.map((view) => view.label)}
            replacements={props.replacements}
            canDelete={item.templates.length === 0 && reservations.length === 0}
          />
        ) : (
          <p className="f-note">
            Χάλασε κάτι; Πες το σε όποιον «Διαχειρίζεται απόθεμα»: αυτός το
            βάζει «σε επισκευή», ώστε να μην το πάρει κανείς σε Γύρισμα. Το
            μητρώο το αλλάζει μόνο εκείνος.
          </p>
        )}
      </div>
    </section>
  );
}

function Details({ item }: { item: EquipmentItemDetail }) {
  return (
    <FBox title="Στοιχεία" hint={item.code ?? item.categoryName}>
      <dl className="ml-kv">
        <dt>Κατηγορία</dt>
        <dd>{item.categoryName}</dd>
        <dt>Κωδικός</dt>
        <dd>{item.code ?? "—"}</dd>
        <dt>Σημείωση</dt>
        <dd>{item.note ?? "—"}</dd>
      </dl>
    </FBox>
  );
}

function History({ history }: { history: readonly HistoryRow[] }) {
  return (
    <FBox title="Ιστορικό" hint={`${history.length} αλλαγές`}>
      <ul className="ml-list">
        {history.map((event) => (
          <li key={event.key} className="ml-line">
            <span className="ml-thumb" aria-hidden="true">
              ·
            </span>
            <div className="ml-main">
              <strong>{event.text}</strong>
              <small>
                {[event.when, event.by].filter(Boolean).join(" · ")}
              </small>
            </div>
          </li>
        ))}
      </ul>
    </FBox>
  );
}

// Η σελίδα του αντικειμένου (prototype `f2-item.tsx`): κεφαλή με τις ενέργειες, και κουτιά για στοιχεία, Δεσμεύσεις,
// συγκρούσεις, ιστορικό. Η κατάσταση ζει στη βάση· μετά από κάθε ενέργεια η σελίδα ξαναδιαβάζεται.
export function F2Item(props: F2ItemProps) {
  const { item } = props;
  return (
    <div className="ml-stack">
      <Hero {...props} />
      {props.picker}
      <F2Reservations
        itemId={item.id}
        status={item.status}
        statusLabel={STATUS_LABELS[item.status]}
        replacements={props.replacements}
        reservations={props.reservations}
        conflicts={props.conflicts}
        candidates={props.candidates}
        access={props.access}
      />
      <Details item={item} />
      <History history={props.history} />
    </div>
  );
}
