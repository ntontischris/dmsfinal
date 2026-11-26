// PROTOTYPE — throwaway. E «Ερωτήσεις»: κάρτες-ερωτήσεις με τον αριθμό της απάντησης· ανοίγουν στους Πελάτες τους.
import type { ReactNode } from "react";

import {
  ClientCards,
  FullList,
  GlanceBox,
  ListMore,
  ProtoSearch,
  Sample,
  type ProtoListProps,
} from "./list-parts";
import { answerOf, rowsOfPick, type Pick } from "./list-model";

export function Question(props: {
  question: string;
  count: ReactNode;
  answer: ReactNode;
  isOpen?: boolean;
  isUrgent?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="ml-box pc-question"
      open={props.isOpen}
      data-urgent={props.isUrgent ? "" : undefined}
    >
      <summary>
        <span className="pc-q-count">{props.count}</span>
        <h2 className="ml-box-title">{props.question}</h2>
        <small>{props.answer}</small>
      </summary>
      <div className="pc-box-body">{props.children}</div>
    </details>
  );
}

function PickQuestion(props: ProtoListProps & { of: Pick }) {
  const answer = answerOf(props.rows, props.of, props.today);
  return (
    <Question
      question={answer.question}
      count={answer.count}
      answer={answer.count === 0 ? "Κανείς — όλα εντάξει." : answer.title}
      isOpen={props.pick === props.of}
      isUrgent={props.of === "owes" && answer.count > 0}
    >
      <ClientCards
        rows={rowsOfPick(props.rows, props.of, props.today)}
        variant={props.variant}
        empty="Κανείς — όλα εντάξει."
      />
    </Question>
  );
}

// Η λήξη Συμφωνίας δεν φτάνει ακόμα στη λίστα: η θέση φαίνεται, χωρίς αριθμό.
function RenewalQuestion() {
  return (
    <Question
      question="Ποιος ανανεώνεται;"
      count="—"
      answer={
        <>
          Συμφωνίες που λήγουν σε 30 μέρες <Sample />
        </>
      }
    >
      <p className="ml-empty">
        <Sample /> Εδώ θα έρχονται οι Πελάτες με Συμφωνία που λήγει ή
        ανανεώνεται αυτόματα σύντομα. Σήμερα η λήξη φαίνεται μέσα στη Σελίδα
        κάθε Πελάτη.
      </p>
    </Question>
  );
}

function SearchQuestion(props: ProtoListProps) {
  return (
    <Question
      question="Ποιον ψάχνω;"
      count={props.rows.length}
      answer={props.query ? `«${props.query}»` : "Όνομα, πόλη, ΑΦΜ — ή όλοι"}
      isOpen={props.query !== "" || props.isAll}
    >
      <ProtoSearch query={props.query} variant={props.variant} />
      <FullList {...props} />
    </Question>
  );
}

export function ListE(props: ProtoListProps) {
  return (
    <div className="pc-page">
      <div className="pc-bar pc-bar-end">
        {props.newOpportunity}
        <ListMore {...props} />
      </div>
      <div className="pc-questions">
        <PickQuestion {...props} of="owes" />
        <RenewalQuestion />
        <PickQuestion {...props} of="noshoot" />
        <SearchQuestion {...props} />
      </div>
      <div className="ml-stack">
        <PickQuestion {...props} of="quiet" />
        <PickQuestion {...props} of="candidate" />
        <GlanceBox glance={props.glance} />
      </div>
    </div>
  );
}
