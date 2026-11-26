// PROTOTYPE — throwaway. E «Ερωτήσεις»: «Τι χρωστά;» και «Τι έρχεται;» ανοιχτές, «Ποιοι είναι;» και «Τι είπαμε;»
// κλειστές· όλα τα κουτιά από κάτω.
import { Line, Lines } from "../b2-box";
import { ClientBoxes } from "../b2-boxes";
import { openBoxOf } from "../b2-page-model";
import {
  BackLink,
  CompactHero,
  DailyActions,
  MoneyLine,
  NextLine,
  TimeLines,
  timelineOfCtx,
  type ProtoClientProps,
} from "./client-parts";
import { Question } from "./list-e";
import { Sample } from "./list-parts";

function Owes({ ctx }: ProtoClientProps) {
  if (ctx.data.ledger === null)
    return (
      <p className="ml-empty">Η Καρτέλα δεν φαίνεται με τα δικαιώματά σου.</p>
    );
  return (
    <Lines>
      <MoneyLine ctx={ctx} />
      {(ctx.data.overdueInvoices ?? []).map((item) => (
        <Line
          key={item.id}
          mark="!"
          isUrgent
          tag="Ληξιπρόθεσμο"
          title={`Τιμολόγιο ${item.number}`}
        />
      ))}
    </Lines>
  );
}

function People({ ctx }: ProtoClientProps) {
  const { contactName, contactPhone, contactEmail, managerName } = ctx.client;
  const reach = [contactPhone, contactEmail].filter(Boolean).join(" · ");
  return (
    <Lines>
      <Line
        mark="☺"
        tag="Επαφή"
        title={contactName ?? "—"}
        sub={reach || undefined}
      />
      <Line mark="★" tag="Υπεύθυνος" title={managerName ?? "—"} />
      <Line
        mark="€"
        tag="Παίρνει τα Τιμολόγια"
        title={
          <>
            {contactEmail ?? "—"} <Sample />
          </>
        }
        isFaded
      />
    </Lines>
  );
}

function Questions(props: ProtoClientProps) {
  const { ctx } = props;
  const line = timelineOfCtx(ctx);
  const overdue = ctx.data.overdueInvoices?.length ?? 0;
  const said = line.done.filter((item) => item.key.startsWith("a-"));
  return (
    <div className="pc-questions">
      <Question
        question="Τι χρωστά;"
        count={overdue}
        answer={ctx.d.money ?? "Τίποτα ανοιχτό"}
        isOpen
        isUrgent={overdue > 0}
      >
        <Owes {...props} />
      </Question>
      <Question
        question="Τι έρχεται;"
        count={line.coming.length}
        answer="Επόμενο βήμα, γύρισμα, λήξη"
        isOpen
      >
        <Lines>
          <NextLine ctx={ctx} />
        </Lines>
        <TimeLines
          items={line.coming.filter((item) => item.key !== "next")}
          empty="Τίποτα άλλο κανονισμένο."
        />
      </Question>
      <Question
        question="Ποιοι είναι;"
        count="☺"
        answer={ctx.client.contactName ?? "Καμία Επαφή"}
      >
        <People {...props} />
      </Question>
      <Question
        question="Τι είπαμε;"
        count={ctx.data.activities?.length ?? 0}
        answer={ctx.data.activities?.[0]?.when ?? "Καμία Δραστηριότητα"}
      >
        <TimeLines items={said} empty="Καμία Δραστηριότητα ακόμα." />
      </Question>
    </div>
  );
}

export function ClientE(props: ProtoClientProps) {
  const { ctx } = props;
  return (
    <div className="pc-page">
      <BackLink variant={props.variant} />
      <CompactHero ctx={ctx} />
      <DailyActions ctx={ctx} />
      <Questions {...props} />
      <ClientBoxes ctx={ctx} open={openBoxOf(props.tab, ctx.boxes)} />
    </div>
  );
}
