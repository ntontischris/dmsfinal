import type { ReactNode } from "react";

import { ListRow, RowList } from "@/spaces/kit/parts";

import "./lane-rows.css";

// Αντίγραφο του `sales/spaces/lane-rows.tsx` (οι Συμφωνίες δεν εισάγουν τις Πωλήσεις). Γραμμές στη μορφή screens2
// (prototype `screens/lane-rows.tsx`): τίτλος έντονος, υπότιτλος αχνός, δεξιά κατάσταση/ενέργεια.
export interface ItemRow {
  id: string;
  title: ReactNode;
  href?: string;
  sub?: ReactNode;
  aside?: ReactNode;
  lead?: ReactNode;
  isHighlighted?: boolean;
  isFaded?: boolean;
}

export function ItemRows({
  items,
  isInset = false,
}: {
  items: readonly ItemRow[];
  isInset?: boolean;
}) {
  return (
    <div className={isInset ? "lane-inset" : "lane-flush"}>
      <RowList>
        {items.map(({ id, ...row }) => (
          <ListRow key={id} {...row} />
        ))}
      </RowList>
    </div>
  );
}
