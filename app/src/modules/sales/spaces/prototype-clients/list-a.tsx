// PROTOTYPE — throwaway. A «Ουρά»: «Θέλουν εσένα» ως 3–5 απαντήσεις, «Πρόσφατοι», όλη η λίστα σε κλειστό κουτί.
import Link from "next/link";

import {
  AllGood,
  AnswerLine,
  ClientCards,
  DailyBar,
  FullListBox,
  GlanceBox,
  PickedHead,
  listHref,
  type ProtoListProps,
} from "./list-parts";
import { answerOf, answersOf, recentOf, rowsOfPick } from "./list-model";
import { withVariant } from "./variants";

function NeedsYou(props: ProtoListProps) {
  const answers = answersOf(props.rows, props.today);
  return (
    <section className="pc-section" aria-labelledby="pc-a-needs">
      <h2 id="pc-a-needs" className="ml-box-title">
        Θέλουν εσένα
      </h2>
      {answers.length === 0 ? (
        <AllGood />
      ) : (
        <ul className="ml-list">
          {answers.map((answer) => (
            <AnswerLine
              key={answer.pick}
              answer={answer}
              href={listHref(props.variant, { pick: answer.pick })}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function Recent(props: ProtoListProps) {
  const recent = recentOf(props.rows);
  if (recent.length === 0) return null;
  return (
    <section className="pc-section" aria-label="Πρόσφατοι">
      <h2 className="pc-kicker">Πρόσφατοι</h2>
      <div className="ml-quick pc-chips" data-align="start">
        {recent.map((row) => (
          <Link key={row.id} href={withVariant(row.href, props.variant)}>
            {row.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

function Picked(props: ProtoListProps) {
  if (props.pick === null) return null;
  const answer = answerOf(props.rows, props.pick, props.today);
  return (
    <section className="pc-section">
      <PickedHead
        title={answer.title}
        variant={props.variant}
        query={props.query}
      />
      <ClientCards
        rows={rowsOfPick(props.rows, props.pick, props.today)}
        variant={props.variant}
      />
    </section>
  );
}

export function ListA(props: ProtoListProps) {
  const isSearching = props.query !== "";
  return (
    <div className="pc-page">
      <DailyBar {...props} />
      {props.pick ? (
        <Picked {...props} />
      ) : (
        !isSearching && <NeedsYou {...props} />
      )}
      {!isSearching && !props.pick && <Recent {...props} />}
      <div className="ml-stack">
        <FullListBox {...props} isOpen={isSearching} />
        <GlanceBox glance={props.glance} />
      </div>
    </div>
  );
}
