import { Notice } from "@/components/ui/notice";

import { BANNER_NOTE, HEALTH_FRESH_TEXT, HEALTH_FRESH_TITLE } from "../labels";
import type { HealthView } from "../schemas";
import { bannerTitle, isFreshSystem } from "../status";
import { AiCard } from "./ai-card";
import { EventsCard } from "./events-card";
import { ExternalCard } from "./external-card";
import { GoogleCard } from "./google-card";
import { JobsCard } from "./jobs-card";
import { SendsCard } from "./sends-card";

interface HealthScreenProps {
  view: HealthView;
  monitorUrl: string | null;
  isOwner: boolean;
}

function Banner({ attention }: { attention: number }) {
  const isRed = attention > 0;
  return (
    <section
      role="status"
      aria-label="Σύνοψη Υγείας"
      className={
        isRed
          ? "rounded-md border border-l-4 border-l-destructive bg-card p-4"
          : "rounded-md border border-l-4 border-l-ok bg-card p-4"
      }
    >
      <h2 className="m-0 text-lg font-medium">{bannerTitle(attention)}</h2>
      <p className="m-0 mt-1 text-sm text-muted-foreground">{BANNER_NOTE}</p>
    </section>
  );
}

// P2 «Υγεία συστήματος» (#215): μπάρα, εξωτερικός έλεγχος και πέντε ενότητες. Σε κινητό όλα σε μία στήλη.
export function HealthScreen({
  view,
  monitorUrl,
  isOwner,
}: HealthScreenProps) {
  if (isFreshSystem(view))
    return (
      <div className="grid gap-4">
        <Notice kind="empty" title={HEALTH_FRESH_TITLE}>
          <p className="m-0">{HEALTH_FRESH_TEXT}</p>
        </Notice>
        <ExternalCard url={monitorUrl} />
      </div>
    );
  return (
    <div className="grid gap-4">
      <Banner attention={view.attention} />
      <div className="grid gap-4 lg:grid-cols-2">
        <JobsCard jobs={view.jobs} />
        <div className="grid content-start gap-4">
          <SendsCard items={view.sends.items} total={view.sends.total} />
          <EventsCard view={view} />
        </div>
        <GoogleCard view={view} />
        <AiCard ai={view.ai} isOwner={isOwner} />
      </div>
      <ExternalCard url={monitorUrl} />
    </div>
  );
}
