import Link from "next/link";

import { OPEN_STATES, findFilming } from "@/data/filming";
import {
  canOpenFilming,
  clientNameOf,
  filmingCapsOf,
  visibleFilmings,
} from "@/data/filming-access";
import { fmtDay } from "@/screens/e3-model";
import { E3Workbench } from "@/screens/e3-workbench";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./e3.css";

export function E3({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = filmingCapsOf(role);
  const visible = visibleFilmings(role);
  const chosen = findFilming(query.id);
  const fallback =
    visible.find((f) => OPEN_STATES.includes(f.state)) ?? visible[0];
  const filming = query.id ? chosen : fallback;
  const keep = { id: filming?.id ?? query.id };

  const switcher = (
    <StateSwitcher role={role} code="E3" state={state} keep={keep} />
  );

  if (!caps.canSee)
    return (
      <>
        {switcher}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Ο ρόλος σου δεν βλέπει Γυρίσματα.</p>
        </StateNotice>
      </>
    );
  if (state === "error")
    return (
      <>
        {switcher}
        <ErrorNotice what="το Γύρισμα" />
      </>
    );
  if (state === "empty" || !filming)
    return (
      <>
        {switcher}
        <StateNotice kind="empty" title="Δεν βρέθηκε Γύρισμα">
          <p>Δεν υπάρχει Γύρισμα για να εμφανιστεί.</p>
        </StateNotice>
      </>
    );
  if (!canOpenFilming(role, filming))
    return (
      <>
        {switcher}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            Το Γύρισμα δεν σε αφορά.{" "}
            {caps.isClient
              ? "Βλέπεις μόνο τα Γυρίσματα του δικού σου χώρου."
              : role === "sales"
                ? "Βλέπεις μόνο Γυρίσματα Πελατών των οποίων είσαι Υπεύθυνος."
                : "Βλέπεις μόνο Γυρίσματα όπου είσαι Μέλος της Παραγωγής ή του Συνεργείου."}
          </p>
        </StateNotice>
      </>
    );

  return (
    <>
      {switcher}
      <nav aria-label="Γυρίσματα">
        <ul className="e3-picker">
          {visible.map((f) => (
            <li key={f.id}>
              <Link
                className="chip"
                data-current={f.id === filming.id}
                href={screenHref(role, "E3", { id: f.id })}
              >
                {clientNameOf(f)} · {fmtDay(f.date)} · {f.state}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <E3Workbench key={filming.id} role={role} caps={caps} initial={filming} />
    </>
  );
}
