import {
  STATE_LABELS as PRODUCTION_STATE_LABELS,
  listProductions,
  periodLabel,
} from "@/modules/productions";
import { ErrorNotice } from "@/spaces/screens/shared";

import { describeActivity, formatDate } from "../helpers";
import { getActivityLookups } from "../queries-lists";
import { listClientActivities } from "../queries-clients";
import type { ListItem } from "../types";
import { ActivitiesSection, ProductionsSection } from "./b2-sections";

// Οι καρτέλες της B2 που φορτώνουν δικά τους δεδομένα μόνο όταν ανοίγουν.

// Η ανάγνωση των Παραγωγών δεν φιλτράρει ανά Πελάτη· κρατάμε του Πελάτη εδώ (λίγες Παραγωγές συνολικά).
export async function ProductionsTab({ clientId }: { clientId: string }) {
  const productions = await listProductions({
    state: null,
    internalOnly: false,
  });
  if (!productions.ok) return <ErrorNotice what="οι Παραγωγές του Πελάτη" />;
  const rows = productions.data
    .filter((production) => production.client?.id === clientId)
    .map((production) => ({
      id: production.id,
      title: production.title,
      sub: [
        production.period
          ? `Περίοδος ${periodLabel(production.period.starts)}`
          : "Εφάπαξ",
        production.owner
          ? `Υπεύθυνος: ${production.owner.name}`
          : "Χωρίς υπεύθυνο",
      ].join(" · "),
      state: PRODUCTION_STATE_LABELS[production.state],
      isOpen: production.state === "open",
    }));
  return <ProductionsSection rows={rows} />;
}

export async function ActivitiesTab({
  clientId,
  canLog,
  kinds,
  openOpportunities,
}: {
  clientId: string;
  canLog: boolean;
  kinds: readonly ListItem[];
  openOpportunities: readonly { id: string; title: string }[];
}) {
  const [activities, lookups] = await Promise.all([
    listClientActivities(clientId),
    getActivityLookups(),
  ]);
  if (!activities.ok || !lookups.ok)
    return <ErrorNotice what="οι Δραστηριότητες" />;
  const rows = activities.data.map((activity) => {
    const described = describeActivity(activity, lookups.data);
    return {
      id: activity.id,
      when: formatDate(activity.occurredAt),
      kind: described.kind,
      text: activity.opportunityTitle
        ? `${described.text} (${activity.opportunityTitle})`
        : described.text,
      by: activity.actorName ?? "Σύστημα",
    };
  });
  return (
    <ActivitiesSection
      rows={rows}
      canLog={canLog}
      kinds={kinds}
      openOpportunities={openOpportunities}
    />
  );
}
