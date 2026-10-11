import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

import type { SheetShot } from "../sheet-types";

import { MutedNote } from "./form-fields";

interface SheetShotListProps {
  items: readonly SheetShot[];
  onMove: (id: string, direction: -1 | 1) => void;
  onRename: (id: string, text: string) => void;
  onRemove: (id: string) => void;
}

// Οι λήψεις με τη σειρά τους: κείμενο, μετακίνηση πάνω/κάτω και διαγραφή. Τα κουμπιά δεν υποβάλλουν τη φόρμα.
export function SheetShotList({ items, onMove, onRename, onRemove }: SheetShotListProps) {
  if (items.length === 0) return <MutedNote>Καμία λήψη ακόμα.</MutedNote>;
  return (
    <ol className="m-0 grid list-none gap-2 p-0">
      {items.map((item, index) => (
        <li key={item.id} className="flex flex-wrap items-center gap-2">
          <span className="w-6 text-sm text-muted-foreground">{index + 1}.</span>
          <Input
            aria-label={`Κείμενο λήψης ${index + 1}`}
            value={item.text}
            maxLength={300}
            onChange={(event) => onRename(item.id, event.target.value)}
            className="min-w-48 flex-1"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Μετακίνηση πάνω"
            disabled={index === 0}
            onClick={() => onMove(item.id, -1)}
          >
            ↑
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Μετακίνηση κάτω"
            disabled={index === items.length - 1}
            onClick={() => onMove(item.id, 1)}
          >
            ↓
          </Button>
          <Button type="button" variant="danger" size="sm" onClick={() => onRemove(item.id)}>
            Διαγραφή
          </Button>
        </li>
      ))}
    </ol>
  );
}
