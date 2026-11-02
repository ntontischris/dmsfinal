import Link from "next/link";
import type { ReactNode } from "react";

import { can, getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { getCatalog } from "../queries-automations";
import { Catalogue, K1Filters } from "./k1-list";
import { parseGroup, parseOnly } from "./k1-model";

import "./k1.css";

export function K1Denied() {
  return (
    <div data-spaces>
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        Τους Αυτοματισμούς τους διαχειρίζεται όποιος «Διαχειρίζεται
        Αυτοματισμούς». Τις δικές σου ειδοποιήσεις τις ρυθμίζεις από τις{" "}
        <Link href={hrefOf("A2", { tab: "prefs" })}>Προτιμήσεις</Link>.
      </StateNotice>
    </div>
  );
}

export function K1Note() {
  return (
    <p className="note">
      Κανένας δεν ειδοποιείται για ό,τι έκανε ο ίδιος. Ένα νέο Γεγονός
      χρειάζεται προγραμματιστή· εδώ αλλάζεις μόνο Αυτοματισμούς και κείμενα.
      Κάθε αλλαγή γράφεται στο Ίχνος ενεργειών (ποιος, πότε, τι).
    </p>
  );
}

export function K1Frame({ children }: { children: ReactNode }) {
  return (
    <div data-spaces>
      {children}
      <K1Note />
    </div>
  );
}

interface SpacesAutomationsProps {
  group: string | undefined;
  only: string | undefined;
}

// K1 Αυτοματισμοί στη νέα εμφάνιση (prototype `screens/K1.tsx`): ο κατάλογος των Γεγονότων ανά ομάδα, με τα φίλτρα του prototype.
export async function SpacesAutomations({
  group,
  only,
}: SpacesAutomationsProps) {
  if (!can(await getViewer(), "automations.manage")) return <K1Denied />;
  const catalog = await getCatalog();
  if (!catalog.ok || !catalog.data)
    return (
      <div data-spaces>
        <ErrorNotice what="τους Αυτοματισμούς" />
      </div>
    );
  const filter = {
    catalog: catalog.data,
    group: parseGroup(catalog.data, group),
    only: parseOnly(only),
  };
  return (
    <K1Frame>
      <K1Filters {...filter} />
      <Catalogue {...filter} />
    </K1Frame>
  );
}
