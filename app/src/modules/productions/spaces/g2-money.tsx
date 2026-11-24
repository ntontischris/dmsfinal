import { Badge, fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { periodLabel } from "../helpers";
import { BILLABLE_REASON_LABELS } from "../labels";
import { getProductionMoney } from "../queries";
import type { ProductionDetail, ProductionMoney } from "../types";
import { G2Box } from "./g2-box";
import { PRICE_OF_LABELS, coverageOf } from "./g2-money-model";
import { ProvisionRows } from "./g2-sections";

function BillableLines({ billables }: Pick<ProductionMoney, "billables">) {
  if (billables.length === 0)
    return (
      <p className="ml-empty">
        Δεν υπάρχει ακόμα Τιμολογητέο για αυτή την Παραγωγή.
      </p>
    );
  return (
    <ul className="ml-list">
      {billables.map((billable) => {
        const coverage = coverageOf(billable.net, billable.covered);
        return (
          <li key={billable.id} className="ml-line">
            <span className="ml-main">
              <strong>{billable.label}</strong>
              <small>
                {`${BILLABLE_REASON_LABELS[billable.reason]} · ${fmtDate(billable.billableOn)}`}
              </small>
            </span>
            <span className="ml-amount">{fmtMoney(billable.net)}</span>
            <span className="ml-quick">
              <Badge tone={coverage.tone}>{coverage.word}</Badge>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// Η τιμή μόνο όταν η βάση την έδωσε (όποιος δεν «Βλέπει ποσά» παίρνει null) και η Παραγωγή έχει Συμφωνία με τιμή.
async function readMoney(
  productionId: string,
): Promise<{ hint: string; billables: ProductionMoney["billables"] } | null> {
  const read = await getProductionMoney(productionId);
  if (!read.ok || read.data === null || read.data.priceOf === null) return null;
  const { price, priceOf, billables } = read.data;
  const hint =
    price === null
      ? "χωρίς τιμή"
      : `${fmtMoney(price)} · ${PRICE_OF_LABELS[priceOf]}`;
  return { hint, billables };
}

// «Παροχές και τιμή»: τι περιλαμβάνει η Συμφωνία για την Περίοδο και τι χρεώνεται, σε ένα κουτί.
// Η Εσωτερική Παραγωγή δεν έχει Συμφωνία: το κουτί λείπει. Η εφάπαξ δεν έχει Περίοδο: λείπουν οι Παροχές.
export async function G2Agreement({
  production,
}: {
  production: ProductionDetail;
}) {
  if (production.isInternal) return null;
  const money = await readMoney(production.id);
  const { period } = production;
  if (!period && !money) return null;
  const hint = [period && periodLabel(period.starts), money?.hint]
    .filter(Boolean)
    .join(" · ");
  return (
    <G2Box title="Παροχές και τιμή" hint={hint}>
      {period && (
        <section>
          <h3 className="ml-box-title">Παροχές της Περιόδου</h3>
          <ProvisionRows production={production} />
        </section>
      )}
      {money && (
        <section>
          <h3 className="ml-box-title">Τιμή και Τιμολογητέα</h3>
          <BillableLines billables={money.billables} />
        </section>
      )}
    </G2Box>
  );
}
