import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { GoogleSettingsCard, getGoogleView } from "@/modules/google";
import { isGoogleConfigured } from "@/lib/google/config";
import {
  AccessNotice,
  TestEmailForm,
  getViewer,
  isOwner,
} from "@/modules/access";
import {
  ConnectionsGrid,
  SubscriptionsSection,
  getConnectionStatuses,
  getSubscriptions,
} from "@/modules/integrations";

export const metadata = { title: "Ενσωματώσεις και συνδρομές" };

interface IntegrationsPageProps {
  searchParams: Promise<{ sub?: string }>;
}

// N5 Ενσωματώσεις και συνδρομές (#209): έξι κάρτες σύνδεσης, GA4/Pixel και μητρώο συνδρομών. Μόνο για τον Ιδιοκτήτη (η βάση
// το ξανακρίνει). Η ρύθμιση του Google ημερολογίου μένει εδώ· το Ιστορικό αποστολών είναι στο K3.
export default async function IntegrationsPage({
  searchParams,
}: IntegrationsPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const header = (
    <ScreenHeader eyebrow="N5 · Ρυθμίσεις" title="Ενσωματώσεις και συνδρομές" />
  );
  if (!isOwner(viewer))
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Τις Ενσωματώσεις και τις συνδρομές τις βλέπει μόνο ο Ιδιοκτήτης.
          </p>
        </AccessNotice>
      </>
    );

  const [connections, subscriptions, google] = await Promise.all([
    getConnectionStatuses(),
    getSubscriptions(),
    getGoogleView(),
  ]);
  return (
    <>
      {header}
      <div className="grid gap-4">
        {connections.ok ? (
          <ConnectionsGrid
            view={connections.data}
            extras={{ email: <TestEmailForm /> }}
          />
        ) : (
          <Notice kind="error" title="Η κατάσταση των συνδέσεων δεν φόρτωσε">
            Δεν χάθηκε τίποτα. Ξαναφόρτωσε τη σελίδα σε λίγο.
          </Notice>
        )}
        <GoogleSettingsCard
          configured={isGoogleConfigured()}
          view={google.ok ? google.data : null}
          ownerEmail={viewer.status === "signed-in" ? viewer.email : ""}
        />
        <Panel label="Τελευταίες αποστολές">
          <p className="m-0 text-sm text-muted-foreground">
            Τι στάλθηκε, σε ποιον και με τι αποτέλεσμα, μαζί με τα
            Προγραμματισμένα και όσα απέτυχαν:{" "}
            <Link href="/app/settings/sends">Ιστορικό αποστολών</Link>.
          </p>
        </Panel>
        {subscriptions.ok ? (
          <SubscriptionsSection
            view={subscriptions.data}
            open={params.sub ?? null}
          />
        ) : (
          <Notice kind="error" title="Οι συνδρομές δεν φόρτωσαν">
            Δεν χάθηκε τίποτα. Ξαναφόρτωσε τη σελίδα σε λίγο.
          </Notice>
        )}
      </div>
    </>
  );
}
