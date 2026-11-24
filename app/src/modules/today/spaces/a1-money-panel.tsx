import Link from "next/link";

import type { TodayMoney } from "../view-schema";
import { initialsOf } from "./a1-deck-model";
import { daysWord, wholeEuros } from "./a1-facts";
import { BriefBox, BriefFoot, BriefLine } from "./a1-lines";
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
    <BriefBox part="money" label="Χρήματα">
      <p className="a1-money-total">
        <strong>{total.amount}</strong> {total.detail}
      </p>
      {money.debtors.length > 0 && (
        <ul className="ml-list">
          {money.debtors.map((debtor, index) => (
            <BriefLine
              key={debtor.id}
              thumb={initialsOf(debtor.name) || "€"}
              title={debtor.name}
              label={debtor.name}
              href={debtor.link}
              sub={
                <>
                  <span>έληξε πριν από {daysWord(debtor.days)}</span>
                  <span className="a1-bar" aria-hidden>
                    <span style={{ width: `${bars[index]}%` }} />
                  </span>
                </>
              }
              amount={wholeEuros(debtor.amountCents)}
            />
          ))}
        </ul>
      )}
      <p className="a1-summary">{pace.sentence}</p>
      {pace.verdict && (
        <>
          <PaceMeter share={pace.share} shouldBe={pace.shouldBe} />
          <p className="a1-summary" data-muted>
            {pace.verdict}
          </p>
        </>
      )}
      <BriefFoot>
        <Link href={href}>Ποιος μας χρωστάει →</Link>
      </BriefFoot>
    </BriefBox>
  );
}
