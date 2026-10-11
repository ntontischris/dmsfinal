import { Input } from "@/components/ui/field";

import type { DeliverableRuleKind } from "../rules-types";

// Ανά είδος Παροχής: προθεσμία σε εργάσιμες και όριο αλλαγών. Το κενό όριο σημαίνει καμία αλλαγή.
export function RulesKindsTable({
  kinds,
}: {
  kinds: readonly DeliverableRuleKind[];
}) {
  if (kinds.length === 0)
    return <p className="m-0 text-sm text-muted-foreground">Δεν υπάρχουν είδη πλήθους.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-md text-left text-sm">
        <thead>
          <tr className="text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Είδος</th>
            <th className="py-2 pr-3 font-medium">Προθεσμία (εργάσιμες)</th>
            <th className="py-2 font-medium">Όριο αλλαγών</th>
          </tr>
        </thead>
        <tbody>
          {kinds.map((kind) => (
            <KindRow key={kind.id} kind={kind} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KindRow({ kind }: { kind: DeliverableRuleKind }) {
  return (
    <tr className="border-t border-border">
      <td className="py-2 pr-3">
        <input type="hidden" name="kindId" value={kind.id} />
        {kind.label}
      </td>
      <td className="py-2 pr-3">
        <Input
          aria-label={`Προθεσμία ${kind.label}`}
          name={`deadline-${kind.id}`}
          type="number"
          min={1}
          max={90}
          required
          defaultValue={kind.deadlineDays}
        />
      </td>
      <td className="py-2">
        <Input
          aria-label={`Όριο αλλαγών ${kind.label}`}
          name={`limit-${kind.id}`}
          type="number"
          min={1}
          max={20}
          defaultValue={kind.revisionLimit ?? ""}
        />
      </td>
    </tr>
  );
}
