import Link from "next/link";

import type { ReportDefinition, ReportFamily } from "../catalog";
import { FAMILY_TITLES } from "../labels";
import { reportHref } from "../url";

const FAMILIES: readonly ReportFamily[] = ["finance", "sales"];

// Ο κατάλογος της M1: οι Αναφορές που βλέπει ο θεατής, ανά οικογένεια, ένα πλακίδιο η καθεμία.
export function ReportCatalogue({ reports }: { reports: readonly ReportDefinition[] }) {
  return (
    <div className="grid gap-6">
      {FAMILIES.map((family) => {
        const own = reports.filter((report) => report.family === family);
        if (own.length === 0) return null;
        return (
          <section key={family} className="grid gap-3">
            <h2 className="kit-label m-0">{FAMILY_TITLES[family]}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {own.map((report) => (
                <Link
                  key={report.id}
                  href={reportHref({ report: report.id })}
                  className="grid min-w-0 gap-1 rounded-md border bg-card px-4 py-3 text-foreground no-underline hover:border-border-strong"
                >
                  <strong className="font-semibold">{report.title}</strong>
                  <span className="text-sm text-muted-foreground">{report.answers}</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
