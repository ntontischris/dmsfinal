import { can, getViewer } from "@/modules/access";
import { AUDIT_TITLE, AuditScreen, readAuditQuery, rpcFilters } from "@/modules/audit";
import { AuditExportButtons } from "@/modules/reports";

export const metadata = { title: AUDIT_TITLE };

interface AuditPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// P1 Ίχνος ενεργειών (?who=&area=&entity=&id=&action=&period=&before=&beforeId=). Η βάση κρίνει τι φαίνεται και τι κρύβεται.
// Η «Εξαγωγή» (Υ5) ζει στις Αναφορές· μόνο για όποιον «Εξάγει δεδομένα» (η βάση θέλει και «Βλέπει ίχνος ενεργειών»).
export default async function AuditPage({ searchParams }: AuditPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const query = readAuditQuery(params);
  return (
    <AuditScreen
      viewer={viewer}
      query={query}
      exportAction={
        can(viewer, "reports.export") ? <AuditExportButtons filters={rpcFilters(query.filters)} /> : undefined
      }
    />
  );
}
