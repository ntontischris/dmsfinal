import Link from "next/link";

import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";

import type { TodayMoney } from "../view-schema";
import { daysWord, wholeEuros } from "./a1-facts";
import { barsOf, overdueTotalOf, paceOf } from "./a1-money";

// «Χρήματα» (#241 Σ4): το σύνολο των ληξιπρόθεσμων, οι 3 μεγαλύτεροι οφειλέτες με μπάρες ανάλογες με τον μεγαλύτερο,
// και ο ρυθμός του μήνα με μια γραμμή εκεί που θα έπρεπε να είμαστε σήμερα.

const percent = (share: number): string => `${Math.round(share * 100)}%`;

function PaceMeter({ share, shouldBe }: { share: number; shouldBe: number }) {
  return (
    <span
      className="a1-pace"
      role="meter"
      aria-label={`Μπήκε το ${percent(share)} των αναμενόμενων· σήμερα θα έπρεπε το ${percent(shouldBe)}`}
      aria-valuenow={Math.round(share * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className="a1-pace-fill" style={{ width: percent(share) }} />
      <span className="a1-pace-mark" style={{ left: percent(shouldBe) }} />
    </span>
  );
}

export function MoneyBrief({
  money,
  href,
}: {
  money: TodayMoney;
  href: string;
}) {
  const total = overdueTotalOf(money);
  const bars = barsOf(money.debtors.map((debtor) => debtor.amountCents));
  const pace = paceOf(money);
  return (
    <div className="a1-brief-panel" data-part="money">
      <Panel label="Χρήματα">
        <p className="a1-money-total">
          <strong>{total.amount}</strong> {total.detail}
        </p>
        {money.debtors.length > 0 && (
          <div className="a1-rows">
            <RowList>
              {money.debtors.map((debtor, index) => (
                <ListRow
                  key={debtor.id}
                  title={debtor.name}
                  href={debtor.link}
                  sub={
                    <>
                      <span>έληξε πριν από {daysWord(debtor.days)}</span>
                      <span className="a1-bar" aria-hidden>
                        <span style={{ width: `${bars[index]}%` }} />
                      </span>
                    </>
                  }
                  aside={
                    <span className="a1-amount">
                      {wholeEuros(debtor.amountCents)}
                    </span>
                  }
                />
              ))}
            </RowList>
          </div>
        )}
        <p className="a1-summary">{pace.sentence}</p>
        {pace.verdict && (
          <>
            <PaceMeter share={pace.share} shouldBe={pace.shouldBe} />
            <p className="muted a1-summary">{pace.verdict}</p>
          </>
        )}
        <footer className="a1-card-foot">
          <Link href={href}>Όλα τα τιμολόγια →</Link>
        </footer>
      </Panel>
    </div>
  );
}
