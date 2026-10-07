import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Panel, StatGrid } from "@/components/ui/panel";
import { Rows } from "@/components/ui/rows";

import type { ReadinessRow } from "../queries";
import { READINESS, actionOf } from "../readiness";
import { ConfirmItemForm, OpenToClientsForm } from "./readiness-forms";

function ItemAside({ row, isOwner }: { row: ReadinessRow; isOwner: boolean }) {
  const action = actionOf(row.note);
  const href = READINESS[row.item]?.href;
  return (
    <>
      {row.done ? (
        <Badge tone="ok">έτοιμο</Badge>
      ) : (
        <Badge tone="strong">εκκρεμεί</Badge>
      )}
      {action.kind === "confirm" && isOwner && (
        <ConfirmItemForm item={row.item} isDone={row.done} />
      )}
      {action.kind === "module" && (
        <span className="text-xs text-muted-foreground">
          έρχεται με {action.name}
        </span>
      )}
      {action.kind === "fill" && !row.done && href && (
        <Link href={href} className="text-sm">
          Συμπλήρωση →
        </Link>
      )}
    </>
  );
}

// O7 Έλεγχος ετοιμότητας: κάθε γραμμή υπολογίζεται από τα δεδομένα. Το άνοιγμα το κάνει μόνο ο Ιδιοκτήτης, μία φορά.
export function ReadinessList({
  rows,
  isOwner,
  openedAt,
}: {
  rows: readonly ReadinessRow[];
  isOwner: boolean;
  openedAt: string | null;
}) {
  const pending = rows.filter((row) => !row.done).length;
  return (
    <div className="grid gap-4">
      <StatGrid
        items={[
          {
            label: "Εκκρεμεί",
            value: String(pending),
            tone: pending > 0 ? "strong" : "ok",
          },
          {
            label: "Έτοιμα",
            value: `${rows.length - pending} / ${rows.length}`,
            tone: pending === 0 ? "ok" : undefined,
          },
        ]}
      />
      <Panel label="Πριν το άνοιγμα σε πελάτες" isFlush>
        <div className="px-4">
          <Rows
            isNumbered
            items={rows.map((row) => ({
              id: row.item,
              title: READINESS[row.item]?.label ?? row.item,
              meta: READINESS[row.item]?.who,
              aside: <ItemAside row={row} isOwner={isOwner} />,
            }))}
          />
        </div>
      </Panel>
      <Panel label="Άνοιγμα σε πελάτες">
        {openedAt ? (
          <p className="m-0 text-sm">
            Το σύστημα άνοιξε σε πελάτες στις{" "}
            {new Date(openedAt).toLocaleString("el-GR", {
              timeZone: "Europe/Athens",
            })}
            . Ο Έλεγχος μένει μόνο για ανάγνωση.
          </p>
        ) : isOwner ? (
          <OpenToClientsForm pending={pending} />
        ) : (
          <p className="m-0 text-sm text-muted-foreground">
            Το «Άνοιγμα σε πελάτες» το κάνει μόνο ο Ιδιοκτήτης, όταν δεν μένει
            κανένα «εκκρεμεί».
          </p>
        )}
      </Panel>
    </div>
  );
}
