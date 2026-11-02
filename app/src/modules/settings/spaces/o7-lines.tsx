import Link from "next/link";

import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import { setReadinessConfirmation } from "../actions";
import type { LineView } from "./o7-adapter";
import { ActionButton } from "./o-form";

// Οι γραμμές του Ελέγχου ετοιμότητας (prototype `screens/o7-lines.tsx`), από τη βάση. Επιβεβαιώνει μόνο ο Ιδιοκτήτης.

function ConfirmButton({
  line,
  isOwner,
}: {
  line: LineView;
  isOwner: boolean;
}) {
  if (isOwner)
    return (
      <ActionButton
        action={setReadinessConfirmation}
        fields={{ item: line.id, confirmed: line.done ? "false" : "true" }}
        label={line.done ? "Αναίρεση" : "Επιβεβαίωση"}
      />
    );
  if (line.done) return null;
  return (
    <>
      <button type="button" className="button" disabled>
        Επιβεβαίωση
      </button>{" "}
      <span className="muted">Επιβεβαιώνει ο Ιδιοκτήτης</span>
    </>
  );
}

interface ActionProps {
  line: LineView;
  isOwner: boolean;
  isLocked: boolean;
}

function LineAction({ line, isOwner, isLocked }: ActionProps) {
  if (isLocked) return null;
  if (line.isManual) return <ConfirmButton line={line} isOwner={isOwner} />;
  if (line.done) return null;
  if (line.comesWith)
    return <span className="muted">έρχεται με {line.comesWith}</span>;
  return line.href ? <Link href={line.href}>Συμπλήρωσε</Link> : null;
}

interface LinesProps {
  lines: readonly LineView[];
  isOwner: boolean;
  isLocked: boolean;
}

export function RequiredLines({ lines, isOwner, isLocked }: LinesProps) {
  return (
    <div className="o-card">
      <Panel
        label="Τι πρέπει να είναι έτοιμο"
        aside={`${lines.filter((line) => line.done).length}/${lines.length}`}
        isFlush
      >
        <RowList>
          {lines.map((line) => (
            <ListRow
              key={line.id}
              lead={
                <span className="part-tile" aria-hidden="true">
                  {line.done ? "✓" : "…"}
                </span>
              }
              title={line.what}
              sub={<>Ποιος το συμπληρώνει: {line.who}</>}
              aside={
                <>
                  {line.done ? (
                    <Badge tone="strong">έτοιμο</Badge>
                  ) : (
                    <Badge tone="attention">εκκρεμεί</Badge>
                  )}
                  <LineAction
                    line={line}
                    isOwner={isOwner}
                    isLocked={isLocked}
                  />
                </>
              }
            />
          ))}
        </RowList>
      </Panel>
    </div>
  );
}
