import Link from "next/link";

import { can, type Viewer } from "@/modules/access";

import { HISTORY_LINK } from "../labels";
import { historyHref } from "../url";

interface SpacesHistoryLinkProps {
  viewer: Viewer;
  entity: string;
  id: string;
}

// «Ιστορικό αλλαγών» στη νέα εμφάνιση: κουμπί-σύνδεσμος όπως οι ενέργειες του prototype. Μόνο για όποιον «Βλέπει ίχνος ενεργειών».
export function SpacesHistoryLink({
  viewer,
  entity,
  id,
}: SpacesHistoryLinkProps) {
  if (!can(viewer, "audit.view")) return null;
  return (
    <Link className="button" href={historyHref(entity, id)}>
      {HISTORY_LINK}
    </Link>
  );
}
