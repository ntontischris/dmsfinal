import Link from "next/link";

import { reportHref, type PeriodCode, type ReportQuery } from "../url";
import type { ClientRef, ReportPeriod } from "../view-schema";
import type { SellerRef } from "../sales-schema";
import { periodLabelWithDates } from "./m1-adapter";

// Τα φίλτρα ζουν στη διεύθυνση: ένας σελιδοδείκτης ξανανοίγει την ίδια Αναφορά με τα ίδια φίλτρα (prototype
// `screens/m1-filters.tsx`). Περίοδοι, Πελάτες και Πωλητές έρχονται από τη βάση· ό,τι δεν έδωσε, δεν φαίνεται.

interface ChipsProps {
  label: string;
  options: readonly { value: string | undefined; label: string }[];
  current: string | undefined;
  hrefFor: (value: string | undefined) => string;
}

function Chips({ label, options, current, hrefFor }: ChipsProps) {
  return (
    <nav className="m1-chips" aria-label={label}>
      <span className="muted">{label}:</span>
      {options.map((o) => (
        <Link
          key={o.value ?? "all"}
          className="badge"
          data-tone={o.value === current ? "strong" : undefined}
          aria-current={o.value === current ? "true" : undefined}
          href={hrefFor(o.value)}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

export interface M1FiltersProps {
  query: ReportQuery;
  // Οι Περίοδοι της βάσης (report_periods)· undefined = η Αναφορά δεν έχει Περίοδο ή δεν φόρτωσαν.
  periods?: readonly (ReportPeriod & { code: PeriodCode })[];
  // Οι Πελάτες του φίλτρου (μόνο ο Τζίρος ανά μήνα).
  clients?: readonly ClientRef[];
  // Οι Πωλητές (μόνο όταν η βάση λέει showSeller).
  sellers?: readonly SellerRef[];
  isScoped?: boolean;
}

export function M1Filters(props: M1FiltersProps) {
  const { query, periods, clients, sellers, isScoped } = props;
  return (
    <div className="m1-filters">
      {periods && periods.length > 0 && (
        <Chips
          hrefFor={(value) =>
            reportHref({ ...query, period: periods.find((p) => p.code === value)?.code })
          }
          label="Περίοδος"
          current={query.period}
          options={periods.map((p) => ({
            value: p.code,
            label: periodLabelWithDates(p),
          }))}
        />
      )}
      {clients && (
        <Chips
          hrefFor={(client) => reportHref({ ...query, client })}
          label="Πελάτης"
          current={query.client}
          options={[
            { value: undefined, label: "Όλοι" },
            ...clients.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      )}
      {sellers && sellers.length > 1 && (
        <Chips
          hrefFor={(seller) => reportHref({ ...query, seller })}
          label="Πωλητής"
          current={query.seller}
          options={[
            { value: undefined, label: "Όλοι" },
            ...sellers.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
      )}
      {isScoped && (
        <p className="note">Βλέπεις μόνο τις Ευκαιρίες όπου είσαι Υπεύθυνος.</p>
      )}
    </div>
  );
}
