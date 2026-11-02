import { lookOf } from "@/components/shell/read-look";
import { can, getViewer } from "@/modules/access";
import {
  AUDIT_TITLE,
  AuditScreen,
  SpacesAudit,
  readAuditQuery,
  rpcFilters,
} from "@/modules/audit";
import { AuditExportButtons } from "@/modules/reports";

export const metadata = { title: AUDIT_TITLE };

interface AuditPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// P1 Ίχνος ενεργειών (?who=&area=&entity=&id=&action=&period=&before=&beforeId=). Η βάση κρίνει τι φαίνεται και τι κρύβεται.
// Η «Εξαγωγή» (Υ5) ζει στις Αναφορές· μόνο για όποιον «Εξάγει δεδομένα» (η βάση θέλει και «Βλέπει ίχνος ενεργειών»).
// Στη νέα εμφάνιση (Χώροι) η οθόνη του prototype· αλλιώς η σημερινή.
export default async function AuditPage({ searchParams }: AuditPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const query = readAuditQuery(params);
  const exportAction = can(viewer, "reports.export") ? (
    <AuditExportButtons filters={rpcFilters(query.filters)} />
  ) : undefined;
  if ((await lookOf(viewer)) === "spaces")
    return (
      <SpacesAudit
        canView={can(viewer, "audit.view")}
        query={query}
        exportAction={exportAction}
      />
    );
  return (
    <AuditScreen viewer={viewer} query={query} exportAction={exportAction} />
  );
}
