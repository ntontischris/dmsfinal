import Link from "next/link";

import { PERIODS, DEFAULT_PERIOD, type ReportDef } from "@/data/reports";
import { reportCapsOf, sellersOf } from "@/data/reports-access";
import type { RoleId } from "@/data/roles";
import { SALES_CLIENTS, memberName } from "@/data/sales";
import { screenHref, type ScreenQuery } from "@/screens/shared";

// Τα φίλτρα ζουν στη διεύθυνση: ένας σελιδοδείκτης ξανανοίγει την ίδια Αναφορά με τα ίδια φίλτρα.
// Δεν υπάρχουν «αποθηκευμένες Αναφορές» στο v1.

interface ChipsProps {
  role: RoleId;
  query: ScreenQuery;
  name: "period" | "client" | "seller";
  label: string;
  options: readonly { value: string | undefined; label: string }[];
  current: string | undefined;
}

function Chips({ role, query, name, label, options, current }: ChipsProps) {
  return (
    <nav className="m1-chips" aria-label={label}>
      <span className="muted">{label}:</span>
      {options.map((o) => (
        <Link
          key={o.value ?? "all"}
          className="badge"
          data-tone={o.value === current ? "strong" : undefined}
          aria-current={o.value === current ? "true" : undefined}
          href={screenHref(role, "M1", { ...query, [name]: o.value })}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

export function M1Filters(props: {
  role: RoleId;
  report: ReportDef;
  query: ScreenQuery;
}) {
  const { role, report, query } = props;
  const sellers = sellersOf(role);
  const isFinance = report.family === "οικονομικές";
  const hasClientFilter = isFinance && report.id === "turnover";
  return (
    <div className="m1-filters">
      {report.usesPeriod && (
        <Chips
          role={role}
          query={query}
          name="period"
          label="Περίοδος"
          current={query.period ?? DEFAULT_PERIOD}
          options={PERIODS.map((p) => ({ value: p.id, label: p.label }))}
        />
      )}
      {hasClientFilter && (
        <Chips
          role={role}
          query={query}
          name="client"
          label="Πελάτης"
          current={query.client}
          options={[
            { value: undefined, label: "Όλοι" },
            ...SALES_CLIENTS.filter((c) => c.status !== "Υποψήφιος").map(
              (c) => ({ value: c.id, label: c.name }),
            ),
          ]}
        />
      )}
      {!isFinance && sellers.length > 1 && (
        <Chips
          role={role}
          query={query}
          name="seller"
          label="Πωλητής"
          current={query.seller}
          options={[
            { value: undefined, label: "Όλοι" },
            ...sellers.map((id) => ({ value: id, label: memberName(id) })),
          ]}
        />
      )}
      {!isFinance && reportCapsOf(role).isScoped && (
        <p className="note">Βλέπεις μόνο τις Ευκαιρίες όπου είσαι Υπεύθυνος.</p>
      )}
    </div>
  );
}
