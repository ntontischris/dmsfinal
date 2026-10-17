import { getViewer } from "@/modules/access";
import {
  EXPORT_TITLE,
  ExportScreen,
  parseDatasetParam,
  parseFormat,
  parseMonth,
  parsePeriod,
} from "@/modules/reports";

export const metadata = { title: EXPORT_TITLE };

interface ExportPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// M2 Εξαγωγή δεδομένων (?dataset=&period=&format=&month=). Η βάση αποφασίζει τι εξάγει ο Χρήστης και γράφει Ίχνος.
export default async function ExportPage({ searchParams }: ExportPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  return (
    <ExportScreen
      viewer={viewer}
      dataset={parseDatasetParam(params.dataset)}
      period={parsePeriod(params.period)}
      format={parseFormat(params.format)}
      month={parseMonth(params.month)}
    />
  );
}
