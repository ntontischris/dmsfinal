// PROTOTYPE — throwaway. C «Αναζήτηση πρώτα»: μια μεγάλη αναζήτηση στο κέντρο, η προσοχή ως μικρά chips, η λίστα
// μόνο αφού γράψεις ή πατήσεις ένα chip.
import Link from "next/link";

import {
  AllGood,
  ClientCards,
  FullList,
  GlanceBox,
  ListMore,
  PickedHead,
  ProtoSearch,
  listHref,
  type ProtoListProps,
} from "./list-parts";
import { answerOf, answersOf, recentOf, rowsOfPick } from "./list-model";
import { withVariant } from "./variants";

function Chips(props: ProtoListProps) {
  const answers = answersOf(props.rows, props.today);
  const recent = recentOf(props.rows, 3);
  return (
    <div className="ml-quick pc-chips pc-center">
      {answers.map((answer) => (
        <Link
          key={answer.pick}
          href={listHref(props.variant, { pick: answer.pick })}
          aria-current={props.pick === answer.pick ? "true" : undefined}
          data-warn={answer.pick === "owes" ? "" : undefined}
        >
          {answer.title}
        </Link>
      ))}
      {recent.map((row) => (
        <Link key={row.id} href={withVariant(row.href, props.variant)}>
          {row.name}
        </Link>
      ))}
      <Link href={listHref(props.variant, { all: "1" })}>
        Όλοι ({props.rows.length})
      </Link>
    </div>
  );
}

const resultsTitle = (props: ProtoListProps): string =>
  props.query
    ? `«${props.query}»: ${props.rows.length} πελάτες`
    : `Όλοι οι πελάτες (${props.rows.length})`;

function Results(props: ProtoListProps) {
  if (props.pick) {
    const answer = answerOf(props.rows, props.pick, props.today);
    return (
      <section className="pc-section">
        <PickedHead title={answer.title} variant={props.variant} query="" />
        <ClientCards
          rows={rowsOfPick(props.rows, props.pick, props.today)}
          variant={props.variant}
        />
      </section>
    );
  }
  if (props.query === "" && !props.isAll) return null;
  return (
    <section className="pc-section">
      <PickedHead
        title={resultsTitle(props)}
        variant={props.variant}
        query=""
      />
      <FullList {...props} />
    </section>
  );
}

export function ListC(props: ProtoListProps) {
  const isIdle = props.query === "" && props.pick === null && !props.isAll;
  const hasAttention = answersOf(props.rows, props.today).length > 0;
  return (
    <div className="pc-page">
      <div className="pc-bar pc-bar-end">
        {props.newOpportunity}
        <ListMore {...props} />
      </div>
      <section className="pc-hero-search" aria-label="Αναζήτηση">
        <h2>Ποιον πελάτη ψάχνεις;</h2>
        <ProtoSearch query={props.query} variant={props.variant} isLarge />
        <Chips {...props} />
        {isIdle && !hasAttention && (
          <AllGood>Κανείς δεν θέλει προσοχή· γράψε ένα όνομα.</AllGood>
        )}
      </section>
      <Results {...props} />
      {isIdle && <GlanceBox glance={props.glance} />}
    </div>
  );
}
