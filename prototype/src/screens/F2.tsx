import Link from "next/link";

import { EQUIPMENT, findEquipment } from "@/data/equipment";
import { equipmentCapsOf } from "@/data/equipment-access";
import { F2Item } from "@/screens/f2-item";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./e3.css";
import "./e5.css";
import "./f.css";

// Σελίδα αντικειμένου: στοιχεία, Δεσμεύσεις, συγκρούσεις, ιστορικό. Ιδ · Δι · Πα (ανάγνωση, δεσμεύει στα δικά της).
export function F2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = equipmentCapsOf(role);
  const item = query.id ? findEquipment(query.id) : EQUIPMENT[0];
  const switcher = (
    <StateSwitcher
      role={role}
      code="F2"
      state={state}
      keep={{ id: item?.id ?? query.id }}
    />
  );

  if (!caps.canSee)
    return (
      <div className="f">
        {switcher}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Ο ρόλος σου δεν βλέπει Εξοπλισμό.</p>
        </StateNotice>
      </div>
    );
  if (state === "error")
    return (
      <div className="f">
        {switcher}
        <ErrorNotice what="το αντικείμενο" />
      </div>
    );
  if (state === "empty" || !item)
    return (
      <div className="f">
        {switcher}
        <StateNotice kind="empty" title="Δεν βρέθηκε αντικείμενο">
          <p>
            Ίσως διαγράφηκε. Δες το{" "}
            <Link href={screenHref(role, "F1", {})}>μητρώο Εξοπλισμού</Link>.
          </p>
        </StateNotice>
      </div>
    );

  return (
    <div className="f">
      {switcher}
      <nav aria-label="Αντικείμενα">
        <ul className="e3-picker">
          {EQUIPMENT.map((other) => (
            <li key={other.id}>
              <Link
                className="chip"
                data-current={other.id === item.id}
                href={screenHref(role, "F2", { id: other.id })}
              >
                {other.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <F2Item key={item.id} role={role} caps={caps} initial={item} />
    </div>
  );
}
