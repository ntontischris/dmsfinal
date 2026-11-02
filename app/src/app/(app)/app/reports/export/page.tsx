import { lookOf } from "@/components/shell/read-look";
import { getViewer } from "@/modules/access";
import {
  EXPORT_TITLE,
  ExportScreen,
  SpacesExport,
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
// Στη νέα εμφάνιση (Χώροι) η οθόνη του prototype· αλλιώς η σημερινή.
export default async function ExportPage({ searchParams }: ExportPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const props = {
    viewer,
    dataset: parseDatasetParam(params.dataset),
    period: parsePeriod(params.period),
    format: parseFormat(params.format),
    month: parseMonth(params.month),
  };
  if ((await lookOf(viewer)) === "spaces")
    return (
      <SpacesExport
        {...props}
        hasDatasetChoice={
          params.dataset !== undefined ||
          params.period !== undefined ||
          params.format !== undefined
        }
      />
    );
  return <ExportScreen {...props} />;
}
