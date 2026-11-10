import Link from "next/link";

import { isGoogleConfigured } from "@/lib/google/config";
import { getViewer, isOwner, sendTestEmail } from "@/modules/access";
import { getGoogleView } from "@/modules/google";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { getSubscriptions } from "../queries";
import { getConnectionStatuses } from "../status";
import { N5Form } from "./n5-forms";
import { GoogleSetup } from "./n5-google";
import { IntegrationsSection } from "./n5-integrations";
import { SubscriptionsSection } from "./n5-subscriptions";

import "./n5.css";

// Τι στάλθηκε, σε ποιον και με τι αποτέλεσμα ζει στο K3· από την κάρτα του email ένας σύνδεσμος εκεί.
function SendsLink() {
  return (
    <p className="muted">
      Τι στάλθηκε, σε ποιον και με τι αποτέλεσμα, μαζί με τα Προγραμματισμένα
      και όσα απέτυχαν:{" "}
      <Link href="/app/settings/sends">Ιστορικό αποστολών</Link>.
    </p>
  );
}

// N5 Ενσωματώσεις και συνδρομές στη νέα εμφάνιση (prototype `screens/N5.tsx`, στο μενού O8): μόνο ο Ιδιοκτήτης
// (η βάση το ξανακρίνει). Το δοκιμαστικό email και η ρύθμιση του Google ημερολογίου μπαίνουν στις κάρτες τους.
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
              <>
                <N5Form
                  action={sendTestEmail}
                  submitLabel="Δοκιμαστικό email στον εαυτό μου"
                  pendingLabel="Αποστολή…"
                />
                <SendsLink />
              </>
            ),
            google: (
              <GoogleSetup
                configured={isGoogleConfigured()}
                view={google.ok ? google.data : null}
                ownerEmail={viewer.status === "signed-in" ? viewer.email : ""}
              />
            ),
          }}
        />
      ) : (
        <ErrorNotice what="η κατάσταση των συνδέσεων" />
      )}
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
