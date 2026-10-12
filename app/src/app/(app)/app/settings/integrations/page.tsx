import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { getDefaults } from "@/modules/agreements";
import { GoogleSettingsCard, getGoogleView } from "@/modules/google";
import { isGoogleConfigured } from "@/lib/google/config";
import { AccessNotice, TestEmailForm, getViewer, isOwner } from "@/modules/access";

export const metadata = { title: "Ενσωματώσεις" };

// O8 Ενσωματώσεις: η κατάσταση του email και του Google. Μόνο για τον Ιδιοκτήτη. Το Ιστορικό αποστολών είναι στο K3 (#174).
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

  const [defaults, google] = await Promise.all([getDefaults(), getGoogleView()]);
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
        <GoogleSettingsCard
          configured={isGoogleConfigured()}
          view={google.ok ? google.data : null}
          ownerEmail={viewer.status === "signed-in" ? viewer.email : ""}
        />
        <Panel label="Τελευταίες αποστολές">
          <p className="m-0 text-sm text-muted-foreground">
            Τι στάλθηκε, σε ποιον και με τι αποτέλεσμα, μαζί με τα Προγραμματισμένα και όσα απέτυχαν:{" "}
            <Link href="/app/settings/sends">Ιστορικό αποστολών</Link>.
          </p>
        </Panel>
      </div>
    </>
  );
}
