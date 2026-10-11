import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

import { queueLabelOf } from "../helpers";
import type { QueueView } from "../types";

interface QueueTabsProps {
  view: QueueView;
  views: readonly QueueView[];
}

// Οι καρτέλες της ουράς ζουν στη διεύθυνση (?view=): η σελίδα δείχνει ό,τι ζητά το URL.
export function QueueTabs({ view, views }: QueueTabsProps) {
  return (
    <nav aria-label="Καρτέλες Παραδοτέων" className="flex flex-wrap gap-2">
      {views.map((value) => {
        const isCurrent = value === view;
        return (
          <Link
            key={value}
            href={`/app/deliverables?view=${value}`}
            aria-current={isCurrent ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: isCurrent ? "primary" : "default", size: "sm" }),
            )}
          >
            {queueLabelOf(value)}
          </Link>
        );
      })}
    </nav>
  );
}
