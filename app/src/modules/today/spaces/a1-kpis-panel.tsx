import Link from "next/link";

import type { StatProps } from "@/spaces/kit/panel";

import type { TodayKpis } from "../view-schema";
import { kpiStatsOf, riskRowsOf } from "./a1-kpis";
import { BriefBox, BriefLine } from "./a1-lines";

// Δείκτες (d9): Τζίρος μήνα, Μπήκαν τον μήνα, Αξία pipeline, Ενεργές Παραγωγές, Περιθώριο φέτος, όσοι επιτρέπονται· από κάτω ο «ραντάρ
// κινδύνου» μόνο όταν κάτι κινδυνεύει. Χωρίς τίποτα, δεν πιάνει χώρο.

// Ένα πλακίδιο: σιγανή ετικέτα, μεγάλος αριθμός, μικρή εξήγηση και βέλος όταν ανοίγει τη λίστα πίσω του.
function KpiTile({ label, value, hint, tone, href }: StatProps) {
  const body = (
    <>
      <span className="a1-kpi-label">{label}</span>
      <strong className="a1-kpi-value">{value}</strong>
      {hint && <small>{hint}</small>}
      {href && (
        <span className="a1-kpi-go" aria-hidden>
          →
        </span>
      )}
    </>
  );
  return (
    <li className="a1-kpi" data-tone={tone}>
      {href ? (
        <Link
          href={href}
          aria-label={[label, value, hint].filter(Boolean).join(", ")}
        >
          {body}
        </Link>
      ) : (
        <div>{body}</div>
      )}
    </li>
  );
}

export function KpiBrief({
  kpis,
  received,
}: {
  kpis: TodayKpis;
  // Τ8: «Μπήκαν τον <μήνα>» δίπλα στον Τζίρο· null = δεν φαίνεται.
  received: number | null;
}) {
  const stats = kpiStatsOf(kpis, received);
  const risks = riskRowsOf(kpis.risks);
  if (stats.length === 0 && risks.length === 0) return null;
  return (
    <div className="a1-kpis" data-part="kpis">
      {stats.length > 0 && (
        <ul className="a1-kpi-row" aria-label="Δείκτες">
          {stats.map((stat) => (
            <KpiTile key={stat.label} {...stat} />
          ))}
        </ul>
      )}
      {risks.length > 0 && (
        <BriefBox part="risks" label="Ραντάρ κινδύνου">
          <ul className="ml-list">
            {risks.map((risk) => (
              <BriefLine
                key={risk.code}
                thumb="!"
                title={risk.title}
                label={risk.title}
                href={risk.href}
                action="Δες"
              />
            ))}
          </ul>
        </BriefBox>
      )}
    </div>
  );
}
