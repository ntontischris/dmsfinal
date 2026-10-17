import { getViewer } from "@/modules/access";
import {
  REPORTS_TITLE,
  ReportsScreen,
  parseClient,
  parsePeriod,
  parseReportId,
} from "@/modules/reports";

export const metadata = { title: REPORTS_TITLE };

interface ReportsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// M1 Αναφορές: κατάλογος ή μία Αναφορά (?report=&period=&client=). Η βάση αποφασίζει ποιος βλέπει τι.
export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  return (
    <ReportsScreen
      viewer={viewer}
      reportId={parseReportId(params.report)}
      filters={{ period: parsePeriod(params.period), clientId: parseClient(params.client) }}
    />
  );
}
