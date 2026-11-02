import { isGoogleConfigured } from "@/lib/google/config";
import { TestEmailForm, getViewer, isOwner } from "@/modules/access";
import { GoogleSettingsCard, getGoogleView } from "@/modules/google";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { getSubscriptions } from "../queries";
import { getConnectionStatuses } from "../status";
import { IntegrationsSection } from "./n5-integrations";
import { SubscriptionsSection } from "./n5-subscriptions";

import "./n5.css";

// N5 Ενσωματώσεις και συνδρομές στη νέα εμφάνιση (prototype `screens/N5.tsx`, στο μενού O8): μόνο ο Ιδιοκτήτης
// (η βάση το ξανακρίνει). Το δοκιμαστικό email και η ρύθμιση του Google ημερολογίου είναι πραγματικά components
// άλλων modules, γι' αυτό μπαίνουν με [data-tw].
export async function SpacesIntegrations({ open }: { open: string | null }) {
  const viewer = await getViewer();
  if (!isOwner(viewer))
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τις συνδρομές και τις ενσωματώσεις τις βλέπει και τις αλλάζει μόνο ο
          Ιδιοκτήτης.
        </StateNotice>
      </div>
    );
  const [connections, subscriptions, google] = await Promise.all([
    getConnectionStatuses(),
    getSubscriptions(),
    getGoogleView(),
  ]);
  return (
    <div data-spaces>
      {connections.ok ? (
        <IntegrationsSection
          items={connections.data.connections}
          analytics={connections.data.analytics}
          extras={{
            email: (
              <div data-tw>
                <TestEmailForm />
              </div>
            ),
          }}
        />
      ) : (
        <ErrorNotice what="η κατάσταση των συνδέσεων" />
      )}
      <div data-tw className="n5-section">
        <GoogleSettingsCard
          configured={isGoogleConfigured()}
          view={google.ok ? google.data : null}
          ownerEmail={viewer.status === "signed-in" ? viewer.email : ""}
        />
      </div>
      <div className="n5-section">
        {subscriptions.ok ? (
          <SubscriptionsSection view={subscriptions.data} open={open} />
        ) : (
          <ErrorNotice what="οι συνδρομές" />
        )}
      </div>
    </div>
  );
}
