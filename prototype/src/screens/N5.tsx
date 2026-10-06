import { INTEGRATIONS, SUBSCRIPTIONS } from "@/data/integrations";
import { teamCapsOf } from "@/data/team-access";
import { IntegrationsSection } from "@/screens/n5-integrations";
import { SubscriptionsSection } from "@/screens/n5-subscriptions";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  type ScreenProps,
} from "@/screens/shared";

import "./n5.css";

// N5 «Ενσωματώσεις και συνδρομές»: μόνο ο Ιδιοκτήτης (απόφαση Η).
export function N5({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const keep = { ...query, state: undefined };
  const header = (
    <StateSwitcher role={role} code="N5" state={state} keep={keep} />
  );
  if (!teamCapsOf(role).isOwner) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τις συνδρομές και τις ενσωματώσεις τις βλέπει και τις αλλάζει μόνο ο
          Ιδιοκτήτης.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τις ενσωματώσεις και τις συνδρομές" />
      </>
    );
  }
  const isEmpty = state === "empty";
  return (
    <>
      {header}
      {isEmpty ? (
        <StateNotice kind="empty" title="Δεν έχει στηθεί καμία σύνδεση ακόμα">
          Τις συνδέσεις (ημερολόγιο Google, email, AI, στατιστικά) τις στήνει ο
          developer. Μόλις στηθούν, εδώ βλέπεις κατάσταση και χρήση τους.
        </StateNotice>
      ) : (
        <IntegrationsSection role={role} query={query} items={INTEGRATIONS} />
      )}
      <SubscriptionsSection
        role={role}
        query={query}
        subs={isEmpty ? [] : SUBSCRIPTIONS}
      />
    </>
  );
}
