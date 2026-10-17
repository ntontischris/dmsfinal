import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { can, type Viewer } from "@/modules/access";

import { HISTORY_LINK } from "../labels";
import { historyHref } from "../url";

interface AuditHistoryLinkProps {
  viewer: Viewer;
  entity: string;
  id: string;
}

// «Ιστορικό αλλαγών» (Υ4): ανοίγει το Ίχνος φιλτραρισμένο στο στοιχείο. Μόνο για όποιον «Βλέπει ίχνος ενεργειών».
export function AuditHistoryLink({
  viewer,
  entity,
  id,
}: AuditHistoryLinkProps) {
  if (!can(viewer, "audit.view")) return null;
  return (
    <Link
      href={historyHref(entity, id)}
      className={buttonVariants({ variant: "ghost" })}
    >
      {HISTORY_LINK}
    </Link>
  );
}
