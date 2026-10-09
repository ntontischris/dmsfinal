import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { TAB_LABELS } from "../labels";
import { PRODUCTION_TABS, type ProductionTab } from "../types";

interface ProductionTabsProps {
  tab: ProductionTab;
  internalOnly: boolean;
}

const listHref = (tab: ProductionTab, internalOnly: boolean): string =>
  `/app/productions?tab=${tab}${internalOnly ? "&internal=1" : ""}`;

// Οι καρτέλες και το φίλτρο «Εσωτερικές» ζουν στη διεύθυνση: η σελίδα δείχνει ό,τι ζητά το URL.
export function ProductionTabs({ tab, internalOnly }: ProductionTabsProps) {
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
      </nav>
      <Link
        href={listHref(tab, !internalOnly)}
        aria-pressed={internalOnly}
        className={cn(
          buttonVariants({ variant: internalOnly ? "primary" : "ghost", size: "sm" }),
        )}
      >
        Εσωτερικές
      </Link>
    </div>
  );
}
