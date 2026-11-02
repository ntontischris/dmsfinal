"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/shell/icons";
import { MENU_LINK, MENU_LIST } from "@/components/shell/menu-styles";
import {
  currentPlace,
  landingOf,
  mobileBar,
  type SpacesShell,
  type SpaceView,
} from "@/components/shell/spaces";
import { ToolMenu } from "@/components/shell/tool-menu";
import { cn } from "@/lib/cn";

const useActiveSpace = (shell: SpacesShell): string | undefined =>
  currentPlace(usePathname(), shell).spaceId;

const PILL_LINK =
  "flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold whitespace-nowrap text-muted-foreground no-underline hover:bg-foreground/8 hover:text-foreground aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground";

// Οι Χώροι στο χάπι πάνω (desktop): εικονίδιο, και η λέξη όταν χωράει.
export function SpaceNav({ shell }: { shell: SpacesShell }) {
  const active = useActiveSpace(shell);
  return (
    <nav aria-label="Χώροι" className="max-md:hidden">
      <ul className="m-0 flex list-none gap-1 p-0">
        {shell.spaces.map((view) => (
          <li key={view.id}>
            <Link
              href={landingOf(view)}
              aria-current={view.id === active ? "page" : undefined}
              title={view.label}
              className={PILL_LINK}
            >
              <Icon name={view.icon} size={18} />
              <span className="max-xl:sr-only">{view.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const BAR_ITEM =
  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-md px-0.5 text-center text-xs leading-tight font-semibold text-muted-foreground no-underline hover:bg-foreground/8 hover:text-foreground";

// «Περισσότερα» του κινητού: οι Χώροι που δεν χωράνε (π.χ. Εταιρεία). Ανάβει όταν είσαι σε έναν από αυτούς.
function MoreSpaces({ views, active }: { views: readonly SpaceView[]; active: string | undefined }) {
  const isActive = views.some((view) => view.id === active);
  return (
    <li className="min-w-0 flex-1">
      <ToolMenu
        label="Περισσότεροι Χώροι"
        summaryClassName={cn(BAR_ITEM, "cursor-pointer border-0 bg-transparent", isActive && "bg-primary text-primary-foreground")}
        summary={
          <>
            <Icon name="more" size={18} />
            <span>Περισσότερα</span>
          </>
        }
      >
        <ul className={cn(MENU_LIST, "right-0 bottom-full mb-2")}>
          {views.map((view) => (
            <li key={view.id}>
              <Link href={landingOf(view)} aria-current={view.id === active ? "page" : undefined} className={MENU_LINK}>
                <Icon name={view.icon} size={18} />
                {view.label}
              </Link>
            </li>
          ))}
        </ul>
      </ToolMenu>
    </li>
  );
}

// Οι Χώροι σε μπάρα κάτω (κινητό): έως 5· με περισσότερους, 4 και οι υπόλοιποι στο «Περισσότερα».
export function BottomBar({ shell }: { shell: SpacesShell }) {
  const active = useActiveSpace(shell);
  const { bar, more } = mobileBar(shell.spaces);
  return (
    <nav
      aria-label="Χώροι"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-muted/90 px-1 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-lg md:hidden"
    >
      <ul className="m-0 flex list-none justify-around gap-1 p-0">
        {bar.map((view) => (
          <li key={view.id} className="min-w-0 flex-1">
            <Link
              href={landingOf(view)}
              aria-current={view.id === active ? "page" : undefined}
              className={cn(BAR_ITEM, "aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground")}
            >
              <Icon name={view.icon} size={18} />
              <span className="max-w-full [overflow-wrap:anywhere]">{view.barLabel}</span>
            </Link>
          </li>
        ))}
        {more.length > 0 && <MoreSpaces views={more} active={active} />}
      </ul>
    </nav>
  );
}
