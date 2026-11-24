"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  landingOf,
  screenCodeOf,
  spaceOf,
  type SpacesModel,
  type SpaceView,
} from "@/spaces/data/spaces";
import { Icon } from "@/spaces/shell/icons";
import { NavPending } from "@/spaces/shell/nav-pending";

interface SideMenuProps {
  model: SpacesModel;
}

// Τα θέματα σε ομάδες με τη σειρά τους· μια αλλαγή ομάδας βάζει διαχωριστικό.
const groupsOf = (
  views: readonly SpaceView[],
): readonly (readonly SpaceView[])[] =>
  views.reduce<SpaceView[][]>((groups, view) => {
    const last = groups.at(-1);
    return last && last[0].group === view.group
      ? [...groups.slice(0, -1), [...last, view]]
      : [...groups, [view]];
  }, []);

// Το αριστερό μενού (desktop): ένα θέμα ανά οντότητα, όπως το παλιό DMS. Οι σελίδες κάθε θέματος είναι κάρτες
// μέσα στη σελίδα (SectionCards), όχι γραμμές κάτω από το θέμα.
export function SideMenu({ model }: SideMenuProps) {
  const active = spaceOf(screenCodeOf(usePathname(), model), model);
  return (
    <nav className="side-menu" aria-label="Μενού" data-spaces>
      {groupsOf(model.spaces).map((group) => (
        <ul key={group[0].id} className="side-menu-group">
          {group.map((view) => (
            <SideItem
              key={view.id}
              view={view}
              isActive={view.id === active?.id}
            />
          ))}
        </ul>
      ))}
    </nav>
  );
}

interface SideItemProps {
  view: SpaceView;
  isActive: boolean;
}

function SideItem({ view, isActive }: SideItemProps) {
  return (
    <li>
      <Link
        href={landingOf(view)}
        aria-current={isActive ? "page" : undefined}
      >
        <Icon name={view.icon} size={18} />
        <span>{view.label}</span>
        <NavPending />
      </Link>
    </li>
  );
}
