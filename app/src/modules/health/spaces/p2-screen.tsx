import { Panel } from "@/spaces/kit/panel";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import {
  BANNER_NOTE,
  HEALTH_FRESH_TEXT,
  HEALTH_FRESH_TITLE,
  HEALTH_NO_ACCESS,
} from "../labels";
import { getHealth } from "../queries";
import { isFreshSystem } from "../status";
import { p2BannerTitle, p2ModelOf } from "./p2-adapter";
import { DownView } from "./p2-down";
import {
  AssistantCapCard,
  FailedSendsCard,
  GoogleSyncCard,
  StuckEventsCard,
} from "./p2-more";
import { ExternalCheckCard, JobsCard } from "./p2-parts";

import "./p2.css";

interface SpacesHealthProps {
  canView: boolean;
  isOwner: boolean;
  monitorUrl: string | null;
  // ?view=down: τι γίνεται όταν το σύστημα δεν απαντά.
  view: string | undefined;
}

function Banner({ count }: { count: number }) {
  return (
    <div
      className="p2-banner"
      data-red={count > 0 ? "true" : undefined}
      role="status"
      aria-label="Σύνοψη Υγείας"
    >
      <Panel
        label={p2BannerTitle(count)}
        aside={
          <Badge tone={count > 0 ? "attention" : "strong"}>
            {count > 0 ? "θέλει προσοχή" : "εντάξει"}
          </Badge>
        }
      >
        <p className="muted">{BANNER_NOTE}</p>
      </Panel>
    </div>
  );
}

// P2 Υγεία συστήματος στη νέα εμφάνιση (prototype `screens/P2.tsx`): σύνοψη και οι ενότητες, από μία ανάγνωση (health_view).
// Οι ενέργειες (Ξαναστείλε, Αγνόησε, Ξαναδοκίμασε) είναι οι πραγματικές· το Δικαίωμα το ξανακρίνει η βάση.
export async function SpacesHealth({
  canView,
  isOwner,
  monitorUrl,
  view,
}: SpacesHealthProps) {
  if (!canView)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {HEALTH_NO_ACCESS}
        </StateNotice>
      </div>
    );
  if (view === "down")
    return (
      <div data-spaces>
        <DownView />
      </div>
    );
  const health = await getHealth();
  if (!health.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="η Υγεία συστήματος" />
      </div>
    );
  if (isFreshSystem(health.data))
    return (
      <div data-spaces>
        <StateNotice kind="empty" title={HEALTH_FRESH_TITLE}>
          {HEALTH_FRESH_TEXT}
        </StateNotice>
        <ExternalCheckCard monitorUrl={monitorUrl} />
      </div>
    );
  const model = p2ModelOf(health.data);
  return (
    <div data-spaces>
      <Banner count={model.attention} />
      <ExternalCheckCard monitorUrl={monitorUrl} />
      <JobsCard jobs={model.jobs} isRed={model.isJobsRed} />
      <FailedSendsCard
        items={model.sends}
        total={model.sendsTotal}
        more={model.sendsMore}
      />
      <GoogleSyncCard google={model.google} />
      <StuckEventsCard
        items={model.events}
        waiting={model.eventsWaiting}
        isRed={model.isEventsRed}
      />
      <AssistantCapCard ai={model.ai} isOwner={isOwner} />
    </div>
  );
}
