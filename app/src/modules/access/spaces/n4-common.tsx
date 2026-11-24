import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { StateNotice } from "@/spaces/screens/shared";

import type { RoleSummary } from "../queries";
import { can, getViewer } from "../viewer";
import { KIND_LABEL } from "./n4-adapter";

import "./n4.css";

// Κοινά της N4 (λίστα, σελίδα Ρόλου, Νέος Ρόλος): η άρνηση και η ετικέτα ενός Ρόλου.

export async function Denied() {
  const viewer = await getViewer();
  return (
    <div data-spaces>
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>
          Τους Ρόλους και τα Δικαιώματά τους (νέοι Ρόλοι, Εύρος, διαγραφή) τους
          αλλάζει μόνο ο Ιδιοκτήτης.
        </p>
        {can(viewer, "access.team") && (
          <p>
            Ρόλους σε Χρήστες ομάδας δίνεις στην{" "}
            <Link href={hrefOf("N1")}>Ομάδα</Link>.
          </p>
        )}
      </StateNotice>
    </div>
  );
}

// «έτοιμος» / «δικός σου», και «κλειδωμένος» για τον Ιδιοκτήτη (κείμενο, όχι κόκκινο σήμα).
export const roleTag = (role: RoleSummary): string =>
  [
    role.isBuiltin ? "έτοιμος" : "δικός σου",
    role.isOwner ? "κλειδωμένος" : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

export const roleKindTag = (role: RoleSummary): string =>
  `Ρόλος ${KIND_LABEL[role.kind]} · ${roleTag(role)}`;
