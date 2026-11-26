// PROTOTYPE — throwaway. C «Αναζήτηση πρώτα»: μία παράγραφος σε απλά ελληνικά, η μπάρα ενεργειών, ακορντεόν.
import { Badge } from "@/spaces/screens/shared";

import { ClientBoxes } from "../b2-boxes";
import { openBoxOf } from "../b2-page-model";
import { briefingOf, factsOf } from "./client-model";
import { BackLink, DailyActions, type ProtoClientProps } from "./client-parts";

export function ClientC(props: ProtoClientProps) {
  const { ctx } = props;
  const hasWorry =
    !!ctx.d.attention || (ctx.data.overdueInvoices?.length ?? 0) > 0;
  return (
    <div className="pc-page">
      <BackLink variant={props.variant} />
      <header className="pc-brief" data-worry={hasWorry ? "" : undefined}>
        <Badge tone={hasWorry ? "attention" : "ok"}>
          {hasWorry ? "Θέλει κάτι από σένα" : "Όλα εντάξει"}
        </Badge>
        <h1>{ctx.client.name}</h1>
        <p className="pc-brief-text">{briefingOf(factsOf(ctx))}</p>
      </header>
      <DailyActions ctx={ctx} />
      <ClientBoxes ctx={ctx} open={openBoxOf(props.tab, ctx.boxes)} />
    </div>
  );
}
