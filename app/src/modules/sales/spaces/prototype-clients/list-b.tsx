// PROTOTYPE — throwaway. B «Πλακίδια»: τέσσερα πλακίδια-μετρητές (το καθένα ένα φίλτρο) και μια ΣΥΝΤΟΜΗ λίστα.
import Link from "next/link";

import {
  AllFilters,
  AllGood,
  ClientCards,
  DailyBar,
  FullList,
  GlanceBox,
  listHref,
  type ProtoListProps,
} from "./list-parts";
import { answerOf, needsYouOf, rowsOfPick, type Pick } from "./list-model";

const TILES: readonly { pick: Pick; label: string }[] = [
  { pick: "overdue", label: "με ληξιπρόθεσμο τιμολόγιο" },
  { pick: "noshoot", label: "χωρίς γύρισμα" },
  { pick: "quiet", label: "σώπασαν 45+ μέρες" },
  { pick: "renew", label: "ανανεώνονται σύντομα" },
];

function Tiles(props: ProtoListProps) {
  return (
    <nav className="pc-tiles" aria-label="Φίλτρα με έναν αριθμό">
      {TILES.map((tile) => {
        const count = answerOf(
          props.rows,
          tile.pick,
          props.today,
          props.sets,
        ).count;
        const isCurrent = props.pick === tile.pick;
        return (
          <Link
            key={tile.pick}
            className="b1-card pc-tile"
            data-current={isCurrent ? "" : undefined}
            data-warn={tile.pick === "overdue" && count > 0 ? "" : undefined}
            aria-current={isCurrent ? "true" : undefined}
            href={listHref(props.variant, {
              pick: isCurrent ? undefined : tile.pick,
            })}
          >
            <strong>{count}</strong>
            <span>{tile.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// Η σύντομη λίστα: όσοι ταιριάζουν στο πλακίδιο, ή όσοι θέλουν εσένα. Οι υπόλοιποι πίσω από το «Δείξε όλους».
function ShortList(props: ProtoListProps) {
  if (props.isAll || props.query !== "") return <FullList {...props} />;
  const rows = props.pick
    ? rowsOfPick(props.rows, props.pick, props.today, props.sets)
    : props.rows.filter((row) => needsYouOf(row, props.today, props.sets));
  if (rows.length === 0 && props.pick === null) return <AllGood />;
  return <ClientCards rows={rows} variant={props.variant} />;
}

export function ListB(props: ProtoListProps) {
  const title = props.isAll || props.query
    ? "Όλοι οι πελάτες"
    : props.pick
      ? answerOf(props.rows, props.pick, props.today, props.sets).title
      : "Θέλουν εσένα";
  return (
    <div className="pc-page">
      <DailyBar {...props} />
      <Tiles {...props} />
      <section className="pc-section">
        <h2 className="ml-box-title">{title}</h2>
        {props.isAll && <AllFilters {...props} />}
        <ShortList {...props} />
        <div className="ml-quick" data-align="start">
          {props.isAll ? (
            <Link href={listHref(props.variant)}>Μόνο όσοι θέλουν εσένα</Link>
          ) : (
            <Link href={listHref(props.variant, { all: "1" })}>
              Δείξε όλους ({props.rows.length})
            </Link>
          )}
        </div>
      </section>
      <GlanceBox glance={props.glance} />
    </div>
  );
}
