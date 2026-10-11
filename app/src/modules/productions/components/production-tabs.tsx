import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { TAB_LABELS } from "../labels";
import { PRODUCTION_TABS, type ProductionTab } from "../types";

interface ProductionTabsProps {
  tab: ProductionTab | "hours";
  internalOnly: boolean;
  hoursCount: number | null; // null = το κόστος δεν φαίνεται σε αυτόν τον θεατή, η καρτέλα κρύβεται
  showInternal: boolean; // ο Πελάτης δεν βλέπει τις Εσωτερικές
}

const listHref = (tab: ProductionTab, internalOnly: boolean): string =>
  `/app/productions?tab=${tab}${internalOnly ? "&internal=1" : ""}`;

// Οι καρτέλες και το φίλτρο «Εσωτερικές» ζουν στη διεύθυνση: η σελίδα δείχνει ό,τι ζητά το URL.
export function ProductionTabs({ tab, internalOnly, hoursCount, showInternal }: ProductionTabsProps) {
  const isHours = tab === "hours";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <nav aria-label="Καρτέλες Παραγωγών" className="flex flex-wrap gap-2">
        {PRODUCTION_TABS.map((value) => {
          const isCurrent = value === tab;
          return (
            <Link
              key={value}
              href={listHref(value, internalOnly)}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                buttonVariants({ variant: isCurrent ? "primary" : "default", size: "sm" }),
              )}
            >
              {TAB_LABELS[value]}
            </Link>
          );
        })}
        {hoursCount !== null && (
          <Link
            href="/app/productions?tab=hours"
            aria-current={isHours ? "page" : undefined}
            className={cn(buttonVariants({ variant: isHours ? "primary" : "default", size: "sm" }))}
          >
            Θέλουν ώρες ({hoursCount})
          </Link>
        )}
      </nav>
      {!isHours && showInternal && (
        <Link
          href={listHref(tab, !internalOnly)}
          aria-pressed={internalOnly}
          className={cn(
            buttonVariants({ variant: internalOnly ? "primary" : "ghost", size: "sm" }),
          )}
        >
          Εσωτερικές
        </Link>
      )}
    </div>
  );
}
