"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon } from "@/components/shell/icons";
import { MENU_LINK, MENU_LIST } from "@/components/shell/menu-styles";
import { currentPlace, type SpaceLink, type SpacesShell } from "@/components/shell/spaces";
import { ToolMenu } from "@/components/shell/tool-menu";
import { cn } from "@/lib/cn";

const TAB =
  "flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium whitespace-nowrap text-muted-foreground no-underline hover:bg-foreground/8 hover:text-foreground max-md:h-11";
const TAB_CURRENT = "bg-foreground text-background hover:bg-foreground hover:text-background";

// «Περισσότερα» στο τέλος των καρτελών: ουρές και υποσελίδες του Χώρου. Ανάβει όταν είσαι σε μία από αυτές.
function MoreTabs({ links, current }: { links: readonly SpaceLink[]; current: string | undefined }) {
  const isActive = links.some((link) => link.href === current);
  return (
    <li>
      <ToolMenu
        label="Περισσότερες οθόνες του Χώρου"
        summaryClassName={cn(TAB, "cursor-pointer border-0 bg-transparent", isActive && TAB_CURRENT)}
        summary={
          <>
            Περισσότερα
            <Icon name="more" size={16} />
          </>
        }
      >
        <ul className={cn(MENU_LIST, "left-0 max-md:right-0 max-md:left-auto")}>
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={link.href === current ? "page" : undefined}
                className={MENU_LINK}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </ToolMenu>
    </li>
  );
}

// Οι καρτέλες του τρέχοντος Χώρου, σε χάπια· αναδιπλώνονται αντί να κυλάνε. Σε εργαλείο (π.χ. Γνώση) δεν φαίνονται.
export function SpaceTabs({ shell }: { shell: SpacesShell }) {
  const { spaceId, href } = currentPlace(usePathname(), shell);
  const view = shell.spaces.find((space) => space.id === spaceId);
  if (!view) return null;
  return (
    <nav aria-label={`Καρτέλες: ${view.label}`} className="mb-6">
      <ul className="m-0 flex list-none flex-wrap gap-1 p-0">
        {view.tabs.map((tab) => {
          const isCurrent = tab.href === href;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(TAB, isCurrent && TAB_CURRENT)}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
        {view.more.length > 0 && <MoreTabs links={view.more} current={href} />}
      </ul>
    </nav>
  );
}
