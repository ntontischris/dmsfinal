import { lookOf } from "@/components/shell/read-look";
import { getViewer } from "@/modules/access";
import {
  REPORTS_TITLE,
  ReportsScreen,
  SpacesReports,
  parseClient,
  parsePeriod,
  parseReportId,
  parseSeller,
} from "@/modules/reports";

export const metadata = { title: REPORTS_TITLE };

interface ReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// M1 Αναφορές: κατάλογος ή μία Αναφορά (?report=&period=&client=&seller=). Η βάση αποφασίζει ποιος βλέπει τι.
// Στη νέα εμφάνιση (Χώροι) η οθόνη του prototype· αλλιώς η σημερινή.
export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const props = {
    viewer,
    reportId: parseReportId(params.report),
    filters: {
      period: parsePeriod(params.period),
      clientId: parseClient(params.client),
      sellerId: parseSeller(params.seller),
    },
  };
  if ((await lookOf(viewer)) === "spaces") return <SpacesReports {...props} />;
  return <ReportsScreen {...props} />;
}
