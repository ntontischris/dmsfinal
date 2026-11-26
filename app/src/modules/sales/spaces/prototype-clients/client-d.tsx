// PROTOTYPE — throwaway. D «Λωρίδες»: γραμμή χρόνου «Έρχεται → Τώρα → Έγινε» ως πρώτο επίπεδο, κουτιά από κάτω.
import { ClientBoxes } from "../b2-boxes";
import { openBoxOf } from "../b2-page-model";
import {
  BackLink,
  CompactHero,
  DailyActions,
  TimeLines,
  timelineOfCtx,
  type ProtoClientProps,
} from "./client-parts";

export function ClientD(props: ProtoClientProps) {
  const { ctx } = props;
  const line = timelineOfCtx(ctx);
  return (
    <div className="pc-page">
      <BackLink variant={props.variant} />
      <CompactHero ctx={ctx} />
      <DailyActions ctx={ctx} />
      <ol className="pc-timeline" aria-label="Γραμμή χρόνου">
        <li data-step="coming">
          <h2 className="ml-box-title">Έρχεται</h2>
          <TimeLines items={line.coming} empty="Τίποτα κανονισμένο." />
        </li>
        <li data-step="now">
          <h2 className="ml-box-title">Τώρα</h2>
          <TimeLines
            items={line.now}
            empty="Όλα εντάξει — τίποτα δεν περιμένει."
          />
        </li>
        <li data-step="done">
          <h2 className="ml-box-title">Έγινε</h2>
          <TimeLines items={line.done} empty="Καμία κίνηση ακόμα." />
        </li>
      </ol>
      <ClientBoxes ctx={ctx} open={openBoxOf(props.tab, ctx.boxes)} />
    </div>
  );
}
