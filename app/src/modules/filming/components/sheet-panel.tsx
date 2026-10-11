import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { formatDateTime } from "../helpers";
import type { SheetView } from "../sheet-types";
import type { CrewMember } from "../types";

import { SheetEditor } from "./sheet-editor";
import { SheetHistory } from "./sheet-history";
import { SheetIssueForm } from "./sheet-issue-form";
import { SheetReadonly } from "./sheet-readonly";
import { SheetResponses } from "./sheet-responses";

interface SheetPanelProps {
  filmingId: string;
  sheet: SheetView;
  crew: readonly CrewMember[];
  viewerId: string | null;
  // Η απάντηση γίνεται μόνο σε ανοιχτό Γύρισμα (η βάση το ελέγχει ξανά).
  canRespond: boolean;
}

// Το Δελτίο γυρίσματος (ομάδα· όχι πελάτης): η κεφαλίδα της έκδοσης, η επεξεργασία ή η ανάγνωση, η έκδοση και το ιστορικό.
export function SheetPanel({ filmingId, sheet, crew, viewerId, canRespond }: SheetPanelProps) {
  const me = crew.find((member) => member.userId === viewerId) ?? null;
  const currentVersion = sheet.current?.version ?? null;
  return (
    <Panel label="Δελτίο">
      <div className="grid gap-4">
        <SheetHeader sheet={sheet} />
        {sheet.canEdit ? (
          <SheetEditor filmingId={filmingId} shots={sheet.shots} crewNote={sheet.crewNote} />
        ) : (
          <SheetReadonly sheet={sheet} />
        )}
        {canRespond && me && !sheet.canEdit && currentVersion !== null && (
          <SheetResponses filmingId={filmingId} member={me} currentVersion={currentVersion} />
        )}
        {sheet.canIssue && <SheetIssueForm filmingId={filmingId} currentVersion={currentVersion} />}
        <SheetHistory versions={sheet.versions} />
      </div>
    </Panel>
  );
}

// «Έκδοση N · ώρα · ποιος»· αν υπάρχουν αλλαγές μετά από αυτήν, σχετικό σήμα.
function SheetHeader({ sheet }: { sheet: SheetView }) {
  const current = sheet.current;
  if (current === null) return <p className="m-0 text-sm text-muted-foreground">Δεν έχει εκδοθεί</p>;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span>{`Έκδοση ${current.version} · ${formatDateTime(current.issuedAt)} · ${current.issuedBy ?? "—"}`}</span>
      {sheet.hasChanges && (
        <Badge tone="attention">{`Υπάρχουν αλλαγές από την έκδοση ${current.version}`}</Badge>
      )}
    </div>
  );
}
