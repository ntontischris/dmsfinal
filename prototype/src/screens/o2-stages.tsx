import Link from "next/link";

import type { RoleId } from "@/data/roles";
import { STAGES } from "@/data/settings-sales";
import { ListEditor, type SettingsListItem } from "@/screens/o-shared";
import { screenHref, type ScreenQuery } from "@/screens/shared";

interface O2StagesProps {
  role: RoleId;
  query: ScreenQuery;
  isEmpty: boolean;
}

// Στάδια: απόσυρση μόνο αφού μεταφερθούν οι ανοιχτές Ευκαιρίες (uses = ανοιχτές).
export function O2Stages({ role, query, isEmpty }: O2StagesProps) {
  const retireNote = (item: SettingsListItem) => {
    const others = STAGES.filter((s) => s.id !== item.id);
    const isMoved = query.moved === item.id;
    if (item.uses === 0 || isMoved) {
      return (
        <>
          {isMoved && `Μεταφέρθηκαν ${item.uses} Ευκαιρίες. `}«{item.label}»
          αποσύρθηκε: φεύγει από τις νέες επιλογές και μετριέται στις Αναφορές.
        </>
      );
    }
    return (
      <span className="stack">
        <span>
          Το «{item.label}» έχει {item.uses} ανοιχτές Ευκαιρίες. Πρέπει πρώτα να
          μεταφερθούν σε άλλο Στάδιο και μετά αποσύρεται.
        </span>
        <label htmlFor="o2-move">Μεταφορά των {item.uses} Ευκαιριών σε</label>
        <select id="o2-move" className="select" defaultValue={others[0]?.id}>
          {others.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <Link
          className="button"
          href={screenHref(role, "O2", {
            state: query.state,
            act: query.act,
            moved: item.id,
          })}
        >
          Μεταφορά και απόσυρση
        </Link>
      </span>
    );
  };
  return (
    <>
      <ListEditor
        role={role}
        query={query}
        code="O2"
        listId="stages"
        title="Στάδια"
        items={isEmpty ? [] : STAGES}
        retireNote={retireNote}
      />
      <p className="muted o-hint">
        Κερδισμένη και Χαμένη δεν είναι Στάδια: είναι σταθερή Έκβαση της
        Ευκαιρίας.
      </p>
    </>
  );
}
