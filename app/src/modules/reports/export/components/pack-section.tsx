import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";

import { monthLabel } from "@/modules/reports/format";
import {
  PACK_MONTH,
  PACK_PARTIAL,
  PACK_SECTION,
  PACK_TEXT,
  PARTIAL_NOTE,
} from "../labels";
import {
  exportHref,
  packMonths,
  pickPackMonth,
  type ExportQuery,
} from "../url";
import { PackDownload } from "./pack-download";

interface PackSectionProps {
  today: string;
  month?: string;
  keep: ExportQuery;
}

// Ρδ «Πακέτο λογιστή»: ένας μήνας (προεπιλογή ο προηγούμενος, ο πρώτος κλεισμένος), ένα κουμπί, ένα .zip.
export function PackSection({ today, month, keep }: PackSectionProps) {
  const months = packMonths(today);
  const current = months[0];
  const chosen = pickPackMonth(months, month);
  const labelOf = (m: string): string =>
    m === current ? `${monthLabel(m)} (${PARTIAL_NOTE})` : monthLabel(m);
  return (
    <Panel label={PACK_SECTION}>
      <div className="grid gap-3">
        <Segmented
          label={PACK_MONTH}
          options={months.map((m) => ({
            label: labelOf(m),
            href: exportHref({ ...keep, month: m }),
            isCurrent: m === chosen,
          }))}
        />
        <p className="m-0 text-sm text-muted-foreground">{PACK_TEXT}</p>
        {chosen === current && (
          <p className="m-0 text-sm text-muted-foreground">{PACK_PARTIAL}</p>
        )}
        <PackDownload month={chosen} />
      </div>
    </Panel>
  );
}
