import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { EXTERNAL } from "../labels";

// Ο εξωτερικός έλεγχος (Υ8, Υ9): αν έχει στηθεί, και σε απλά λόγια τι γίνεται όταν το σύστημα δεν απαντά.
// Χωρίς διαθεσιμότητα 30 ημερών στην πρώτη έκδοση.
export function ExternalCard({ url }: { url: string | null }) {
  return (
    <Panel
      label={EXTERNAL.title}
      aside={
        url ? (
          <Badge tone="ok">στημένος</Badge>
        ) : (
          <Badge tone="strong">δεν έχει στηθεί</Badge>
        )
      }
    >
      <div className="grid gap-3 text-sm">
        {url ? (
          <p className="m-0">
            {EXTERNAL.setUp}{" "}
            <a href={url} target="_blank" rel="noreferrer">
              {EXTERNAL.open}
            </a>
          </p>
        ) : (
          <p className="m-0" data-testid="external-not-set-up">
            {EXTERNAL.notSetUp}
          </p>
        )}
        <section aria-labelledby="health-down" className="grid gap-2">
          <h3 id="health-down" className="m-0 text-base font-medium">
            {EXTERNAL.downTitle}
          </h3>
          {EXTERNAL.downText.map((line) => (
            <p key={line} className="m-0 text-muted-foreground">
              {line}
            </p>
          ))}
        </section>
      </div>
    </Panel>
  );
}
