import type { ReportDef } from "@/data/reports";
import type { PeriodRange } from "@/data/reports-access";
import type { RoleId } from "@/data/roles";

// Το συμβόλαιο ανάμεσα στον σκελετό της M1 και στα σώματα των Αναφορών (m1-finance, m1-sales).
export interface ReportBodyProps {
  role: RoleId;
  report: ReportDef;
  range: PeriodRange;
  clientId?: string;
  sellerId?: string;
  isEmpty: boolean;
  canExport: boolean;
}
