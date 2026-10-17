import { monthLabel, moneyOrDash } from "../format";
import { barPercent, maxAmount } from "../helpers";
import type { TurnoverMonth } from "../view-schema";

// Δύο μπάρες ανά μήνα: Τζίρος (χρώμα έμφασης) και Εισπράξεις (ουδέτερο). Μόνο με ποσά. Ο πίνακας κάτω λέει τα ίδια,
// άρα το γράφημα είναι κρυφό για τους αναγνώστες οθόνης.

function BarRow(props: {
  value: number | null;
  max: number;
  isCollections?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <div
        className={
          props.isCollections
            ? "h-3 min-w-0.5 flex-none rounded-sm bg-muted-foreground"
            : "h-3 min-w-0.5 flex-none rounded-sm bg-primary"
        }
        style={{ width: `${0.6 * barPercent(props.value ?? 0, props.max)}%` }}
      />
      <span className="min-w-0 tabular-nums">{moneyOrDash(props.value)}</span>
    </div>
  );
}

export function TurnoverChart({
  months,
}: {
  months: readonly TurnoverMonth[];
}) {
  const max = maxAmount(months);
  return (
    <div
      aria-hidden="true"
      className="grid min-w-0 gap-3 rounded-md border bg-card p-4"
    >
      {months.map((m) => (
        <div key={m.month} className="grid min-w-0 gap-1">
          <span className="text-sm text-muted-foreground">
            {monthLabel(m.month)}
          </span>
          <BarRow value={m.turnover} max={max} />
          <BarRow value={m.collections} max={max} isCollections />
        </div>
      ))}
      <span className="text-sm text-muted-foreground">
        Πρώτη μπάρα: Τζίρος (χωρίς ΦΠΑ) · δεύτερη: Εισπράξεις (με ΦΠΑ)
      </span>
    </div>
  );
}
