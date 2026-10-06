import Link from "next/link";

import { TEAM_MEMBERS } from "@/data/calendar";
import type { CalendarCaps } from "@/data/calendar-access";
import type { RoleId } from "@/data/roles";
import { a5Href, type A5Params, type LayerKey } from "@/screens/a5-dates";

interface A5FiltersProps {
  role: RoleId;
  caps: CalendarCaps;
  params: A5Params;
}

const LAYERS: readonly { key: LayerKey; label: string; teamOnly?: boolean }[] =
  [
    { key: "filmings", label: "Γυρίσματα" },
    { key: "blocked", label: "Κλεισμένος χρόνος" },
    { key: "deadlines", label: "Προθεσμίες" },
    { key: "team", label: "Ομάδα", teamOnly: true },
  ];

function PersonFilter({ role, caps, params }: A5FiltersProps) {
  const options = [
    { id: undefined, label: "Όλοι" },
    ...(caps.me ? [{ id: caps.me, label: "Εγώ" }] : []),
    ...TEAM_MEMBERS.filter((member) => member.id !== caps.me).map((member) => ({
      id: member.id,
      label: member.name,
    })),
  ];
  return (
    <div className="a5-filter">
      <span className="muted">Άτομο:</span>
      {options.map((option) => (
        <Link
          key={option.label}
          className="a5-chip"
          href={a5Href(role, params, { person: option.id })}
          aria-current={params.person === option.id}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

function LayerFilter({ role, caps, params }: A5FiltersProps) {
  const layers = LAYERS.filter((layer) => !layer.teamOnly || caps.seesTeamBusy);
  return (
    <div className="a5-filter">
      <span className="muted">Στρώσεις:</span>
      {layers.map((layer) => {
        const isOn = !params.hide.includes(layer.key);
        const hide = isOn
          ? [...params.hide, layer.key]
          : params.hide.filter((key) => key !== layer.key);
        return (
          <Link
            key={layer.key}
            className="a5-chip"
            href={a5Href(role, params, { hide })}
            aria-pressed={isOn}
            data-on={isOn}
          >
            {isOn ? "✓ " : ""}
            {layer.label}
          </Link>
        );
      })}
    </div>
  );
}

export function A5Filters(props: A5FiltersProps) {
  if (props.caps.isClient) return null;
  const showPerson = props.caps.seesAll || props.caps.seesTeamBusy;
  return (
    <div className="a5-filters">
      {showPerson && <PersonFilter {...props} />}
      <LayerFilter {...props} />
    </div>
  );
}
