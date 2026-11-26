// PROTOTYPE — throwaway. D «Λωρίδες»: τρεις λωρίδες δίπλα δίπλα (Θέλουν εσένα / Τρέχουν κανονικά / Ήσυχοι) με
// μικρές κάρτες· στο κινητό η μία κάτω από την άλλη.
import type { B1Row } from "../b1-adapter";
import {
  AllGood,
  ClientCards,
  DailyBar,
  FullListBox,
  GlanceBox,
  type ProtoListProps,
} from "./list-parts";
import { laneOf, type Lane } from "./list-model";
import type { Variant } from "./variants";

const LANES: readonly { lane: Lane; title: string; hint: string }[] = [
  { lane: "needs", title: "Θέλουν εσένα", hint: "χρωστούν ή χωρίς γύρισμα" },
  { lane: "running", title: "Τρέχουν κανονικά", hint: "ενεργοί, με επαφή" },
  { lane: "quiet", title: "Ήσυχοι", hint: "σώπασαν, υποψήφιοι, ανενεργοί" },
];

// Πόσες κάρτες φαίνονται σε κάθε λωρίδα πριν το «+N ακόμα».
const SHOWN = 6;

function LaneColumn(props: {
  title: string;
  hint: string;
  lane: Lane;
  rows: readonly B1Row[];
  variant: Variant;
}) {
  const first = props.rows.slice(0, SHOWN);
  const rest = props.rows.slice(SHOWN);
  return (
    <section className="pc-lane" data-lane={props.lane}>
      <header>
        <h2 className="ml-box-title">
          {props.title} <span className="pc-count">{props.rows.length}</span>
        </h2>
        <small>{props.hint}</small>
      </header>
      {props.lane === "needs" && props.rows.length === 0 ? (
        <AllGood />
      ) : (
        <ClientCards rows={first} variant={props.variant} />
      )}
      {rest.length > 0 && (
        <details className="pc-more">
          <summary>+{rest.length} ακόμα</summary>
          <ClientCards rows={rest} variant={props.variant} />
        </details>
      )}
    </section>
  );
}

export function ListD(props: ProtoListProps) {
  const open = props.rows.filter((row) => !row.isTaken);
  return (
    <div className="pc-page">
      <DailyBar {...props} />
      <div className="pc-lanes">
        {LANES.map((lane) => (
          <LaneColumn
            key={lane.lane}
            {...lane}
            rows={open.filter((row) => laneOf(row, props.today) === lane.lane)}
            variant={props.variant}
          />
        ))}
      </div>
      <div className="ml-stack">
        <FullListBox {...props} isOpen={props.query !== ""} />
        <GlanceBox glance={props.glance} />
      </div>
    </div>
  );
}
