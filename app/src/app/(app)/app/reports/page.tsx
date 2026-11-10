import { getViewer } from "@/modules/access";
import {
  REPORTS_TITLE,
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

// M1 Αναφορές (Χώροι): κατάλογος ή μία Αναφορά (?report=&period=&client=&seller=). Η βάση αποφασίζει ποιος βλέπει τι.
export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  return (
    <SpacesReports
      viewer={viewer}
      reportId={parseReportId(params.report)}
      filters={{
        period: parsePeriod(params.period),
        clientId: parseClient(params.client),
        sellerId: parseSeller(params.seller),
      }}
    />
  );
}
