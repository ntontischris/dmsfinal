import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import type { Verdict } from "../status";

// Μία ενότητα της Υγείας: τίτλος, σήμα κατάστασης και κόκκινη γραμμή αριστερά όταν θέλει προσοχή.
export function HealthCard({
  title,
  verdict,
  children,
}: {
  title: string;
  verdict: Verdict;
  children: ReactNode;
}) {
  return (
    <Panel
      label={title}
      aside={<Badge tone={verdict.tone}>{verdict.label}</Badge>}
      className={
        verdict.tone === "attention"
          ? "border-l-4 border-l-destructive"
          : undefined
      }
    >
      <div className="grid gap-3">{children}</div>
    </Panel>
  );
}
