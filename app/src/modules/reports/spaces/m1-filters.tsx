import { FilterBar, type FilterGroup } from "@/spaces/kit/filter-bar";

import { reportHref, type PeriodCode, type ReportQuery } from "../url";
import type { ClientRef, ReportPeriod } from "../view-schema";
import type { SellerRef } from "../sales-schema";
import { periodLabelWithDates } from "./m1-adapter";

// Τα φίλτρα ζουν στη διεύθυνση: ένας σελιδοδείκτης ξανανοίγει την ίδια Αναφορά με τα ίδια φίλτρα (prototype
// `screens/m1-filters.tsx`), σε μία σειρά καρτών. Περίοδοι, Πελάτες και Πωλητές έρχονται από τη βάση· ό,τι δεν έδωσε,
// δεν φαίνεται.

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

const periodGroupOf = (
  query: ReportQuery,
  periods: readonly (ReportPeriod & { code: PeriodCode })[],
): FilterGroup => ({
  label: "Περίοδος",
  options: periods.map((p) => ({
    label: periodLabelWithDates(p),
    href: reportHref({ ...query, period: p.code }),
    isCurrent: p.code === query.period,
  })),
});

const clientGroupOf = (
  query: ReportQuery,
  clients: readonly ClientRef[],
): FilterGroup => ({
  label: "Πελάτης",
  isSearchable: true,
  all: {
    label: "όλοι",
    href: reportHref({ ...query, client: undefined }),
    isCurrent: !query.client,
  },
  options: clients.map((c) => ({
    label: c.name,
    href: reportHref({ ...query, client: c.id }),
    isCurrent: query.client === c.id,
  })),
});

const sellerGroupOf = (
  query: ReportQuery,
  sellers: readonly SellerRef[],
): FilterGroup => ({
  label: "Πωλητής",
  all: {
    label: "όλοι",
    href: reportHref({ ...query, seller: undefined }),
    isCurrent: !query.seller,
  },
  options: sellers.map((s) => ({
    label: s.name,
    href: reportHref({ ...query, seller: s.id }),
    isCurrent: query.seller === s.id,
  })),
});

export function M1Filters(props: M1FiltersProps) {
  const { query, periods, clients, sellers, isScoped } = props;
  const filters = [
    ...(periods && periods.length > 0 ? [periodGroupOf(query, periods)] : []),
    ...(clients ? [clientGroupOf(query, clients)] : []),
    ...(sellers && sellers.length > 1 ? [sellerGroupOf(query, sellers)] : []),
  ];
  return (
    <div className="m1-filters">
      {filters.length > 0 && (
        <FilterBar
          name="m1-filters"
          filters={filters}
          clearHref={reportHref({
            ...query,
            client: undefined,
            seller: undefined,
          })}
        />
      )}
      {isScoped && (
        <p className="note">Βλέπεις μόνο τις Ευκαιρίες όπου είσαι Υπεύθυνος.</p>
      )}
    </div>
  );
}
