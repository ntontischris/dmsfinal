import { Panel } from "@/components/ui/panel";

import type { DeliverableVersion } from "../types";

import { MutedNote } from "./form-fields";
import { VersionCard } from "./version-card";

interface VersionsPanelProps {
  versions: readonly DeliverableVersion[];
  deliverableId: string;
  canComment: boolean;
}

// Οι Εκδόσεις, νεότερη πρώτη. Η τελευταία είναι αυτή που περιμένει ενέργεια.
export function VersionsPanel({ versions, deliverableId, canComment }: VersionsPanelProps) {
  return (
    <Panel label="Εκδόσεις" aside={`${versions.length} συνολικά`}>
      {versions.length === 0 ? (
        <MutedNote>Δεν υπάρχουν ακόμα Εκδόσεις. Πρόσθεσε την πρώτη με «Προσθήκη Έκδοσης».</MutedNote>
      ) : (
        <div className="grid gap-5">
          {versions.map((version) => (
            <VersionCard
              key={version.number}
              version={version}
              deliverableId={deliverableId}
              canComment={canComment}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}
