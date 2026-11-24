"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  landingOf,
  screenCodeOf,
  spaceOf,
  type ScreenLink,
  type SpacesModel,
  type SpaceView,
} from "@/spaces/data/spaces";
import { Icon } from "@/spaces/shell/icons";
import { NavPending } from "@/spaces/shell/nav-pending";

interface SideMenuProps {
  model: SpacesModel;
}

// Οι υπο-σελίδες ενός θέματος, κάτω από αυτό όταν είναι ανοιχτό: οι άλλες λίστες του, οι ουρές τους και ό,τι άλλο έχει.
const subLinksOf = (view: SpaceView): readonly ScreenLink[] => [
  ...view.tabs.slice(1),
  ...view.tabs.flatMap((tab) => view.queues[tab.code] ?? []),
  ...view.more,
];

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

// Το αριστερό μενού (desktop): ένα θέμα ανά οντότητα, όπως το παλιό DMS. Το ενεργό ανοίγει τις υπο-σελίδες του.
export function SideMenu({ model }: SideMenuProps) {
  const code = screenCodeOf(usePathname(), model);
  const active = spaceOf(code, model);
  return (
    <nav className="side-menu" aria-label="Μενού" data-spaces>
      {groupsOf(model.spaces).map((group) => (
        <ul key={group[0].id} className="side-menu-group">
          {group.map((view) => (
            <SideItem
              key={view.id}
              view={view}
              code={code}
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
  code: string | undefined;
  isActive: boolean;
}

function SideItem({ view, code, isActive }: SideItemProps) {
  const subLinks = isActive ? subLinksOf(view) : [];
  const isOnSub = subLinks.some((link) => link.code === code);
  return (
    <li data-active={isActive}>
      <Link
        href={landingOf(view)}
        aria-current={isActive && !isOnSub ? "page" : undefined}
      >
        <Icon name={view.icon} size={18} />
        <span>{view.label}</span>
        <NavPending />
      </Link>
      {subLinks.length > 0 && (
        <ul className="side-menu-sub">
          {subLinks.map((link) => (
            <li key={link.code}>
              <Link
                href={link.href}
                aria-current={link.code === code ? "page" : undefined}
              >
                {link.label}
                <NavPending />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
