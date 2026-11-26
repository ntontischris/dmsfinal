// PROTOTYPE — throwaway. A «Ουρά»: μικρή κεφαλίδα, μία γραμμή «Επόμενο», μία για τα χρήματα, οι ενέργειες,
// πέντε κλειστά κουτιά.
import { Lines } from "../b2-box";
import { ClientBoxes } from "../b2-boxes";
import { openBoxOf } from "../b2-page-model";
import {
  AttentionLine,
  BackLink,
  CompactHero,
  DailyActions,
  MoneyLine,
  NextLine,
  type ProtoClientProps,
} from "./client-parts";

export function ClientA(props: ProtoClientProps) {
  const { ctx } = props;
  return (
    <div className="pc-page">
      <BackLink variant={props.variant} />
      <CompactHero ctx={ctx} />
      <Lines label="Μπροστά σου">
        <AttentionLine {...props} />
        <NextLine ctx={ctx} />
        <MoneyLine ctx={ctx} />
      </Lines>
      <DailyActions ctx={ctx} />
      <ClientBoxes ctx={ctx} open={openBoxOf(props.tab, ctx.boxes)} />
    </div>
  );
}
