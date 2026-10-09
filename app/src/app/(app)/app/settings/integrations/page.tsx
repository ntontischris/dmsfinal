import { ScreenHeader } from "@/components/shell/screen-header";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getDefaults } from "@/modules/agreements";
import {
  AccessNotice,
  EmailLogList,
  TestEmailForm,
  getViewer,
  isOwner,
  listEmailLog,
} from "@/modules/access";

export const metadata = { title: "Ενσωματώσεις" };

// O8 Ενσωματώσεις: η κατάσταση του email και το Ιστορικό αποστολών. Μόνο για τον Ιδιοκτήτη.
export default async function IntegrationsPage() {
  const viewer = await getViewer();
  const header = <ScreenHeader eyebrow="O8 · Ρυθμίσεις" title="Ενσωματώσεις" />;
  if (!isOwner(viewer))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">Τις Ενσωματώσεις τις βλέπει μόνο ο Ιδιοκτήτης.</p>
        </AccessNotice>
      </>
    );

  const [defaults, log] = await Promise.all([getDefaults(), listEmailLog(20)]);
  const connected = defaults.ok && defaults.data.emailSenderConnected;
  return (
    <>
      {header}
      <div className="grid gap-4">
        <Panel
          label="Email"
          aside={
            <Badge tone={connected ? "ok" : "attention"}>
              {connected ? "Συνδεδεμένο" : "Δεν έχει σταλεί ακόμα"}
            </Badge>
          }
        >
          <div className="grid gap-4">
            <p className="m-0 text-sm text-muted-foreground">
              Όλα τα email του συστήματος φεύγουν από το Resend, από
              noreply@devremedia.com. Το κλειδί ρυθμίζεται στο Vercel, όχι εδώ.
            </p>
            <TestEmailForm />
          </div>
        </Panel>
        <Panel label="Τελευταίες αποστολές" aside="20" isFlush>
          {log.ok ? (
            <EmailLogList rows={log.data} />
          ) : (
            <p className="m-0 p-4 text-sm text-destructive">
              Το Ιστορικό δεν φόρτωσε. Δοκίμασε ξανά.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
