import Link from "next/link";

import type { RoleId } from "@/data/roles";
import { findClient } from "@/data/sales";
import { WORKS, type Work } from "@/data/website";
import {
  isCaseStudy,
  workBlockers,
  workStatus,
  type PublishStatus,
} from "@/data/website-access";
import { NothingYet } from "@/screens/q-consent";
import {
  AuditLine,
  EntryList,
  ListToolbar,
  QFrame,
  type QRow,
} from "@/screens/q-shared";
import { WorkForm } from "@/screens/q2-form";
import { screenHref, type ScreenProps } from "@/screens/shared";

const FILTERS: readonly {
  key: string | undefined;
  label: string;
  status?: PublishStatus;
}[] = [
  { key: undefined, label: "Όλες" },
  { key: "hidden", label: "Δεν φαίνονται", status: "Δεν φαίνεται" },
  { key: "el", label: "Στα ελληνικά", status: "Φαίνεται στα ελληνικά" },
  { key: "en", label: "Και στα αγγλικά", status: "Φαίνεται και στα αγγλικά" },
];

const subOf = (w: Work): string => {
  const client = findClient(w.clientId);
  const parts = [
    w.isOwnProduction ? "Δική μας παραγωγή" : client?.name,
    isCaseStudy(w, "el") ? "case study" : undefined,
    w.isFeatured ? "επιλεγμένη" : undefined,
  ];
  return parts.filter(Boolean).join(" · ");
};

const toRow = (w: Work): QRow => ({
  id: w.id,
  name: w.titleEl,
  sub: subOf(w),
  status: workStatus(w),
  blockersEl: workBlockers(w, "el"),
  blockersEn: workBlockers(w, "en"),
  isShown: w.isShown,
  order: w.order,
  isConsentMissing: !w.isOwnProduction && !w.consent.isGiven,
});

function FilterChips({ role, active }: { role: RoleId; active?: string }) {
  return (
    <>
      {FILTERS.map((f) => (
        <Link
          key={f.label}
          className="chip"
          data-current={f.key === active}
          href={screenHref(role, "Q2", { status: f.key })}
        >
          {f.label}
        </Link>
      ))}
    </>
  );
}

function WorkList({
  role,
  query,
  isEmpty,
}: {
  role: RoleId;
  query: ScreenProps["query"];
  isEmpty: boolean;
}) {
  const wanted = FILTERS.find((f) => f.key === query.status)?.status;
  const rows = WORKS.map(toRow).filter((r) => !wanted || r.status === wanted);
  return (
    <>
      <h1>Δουλειές και case studies</h1>
      <p className="muted">
        Μια Δουλειά με ιστορία (πρόκληση, λύση, αποτέλεσμα) γίνεται case study.
        Χωρίς Συναίνεση του πελάτη δεν ανάβει, εκτός αν είναι δική μας παραγωγή.
      </p>
      <ListToolbar role={role} code="Q2" newLabel="+ Νέα Δουλειά">
        <FilterChips role={role} active={query.status} />
      </ListToolbar>
      {isEmpty ? (
        <NothingYet title="Δεν υπάρχουν Δουλειές ακόμα">
          Πρώτο βήμα: πάτα «+ Νέα Δουλειά», βάλε τίτλο, βίντεο και εξώφυλλο. Αν
          είναι για πελάτη, θα χρειαστεί μετά η Συναίνεσή του.
        </NothingYet>
      ) : rows.length === 0 ? (
        <NothingYet title="Καμία Δουλειά σε αυτή την κατάσταση">
          Δοκίμασε άλλο φίλτρο ή «Όλες».
        </NothingYet>
      ) : (
        <EntryList role={role} code="Q2" rows={rows} nameLabel="Δουλειά" />
      )}
      <AuditLine role={role} />
    </>
  );
}

// Q2 «Δουλειές και case studies»: με Συναίνεση δημοσίευσης, εκτός από δική μας παραγωγή.
export function Q2({ role, query }: ScreenProps) {
  return (
    <QFrame role={role} query={query} code="Q2" what="τις Δουλειές">
      {(state) => {
        if (query.item === "new") return <WorkForm role={role} query={query} />;
        const open = WORKS.find((w) => w.id === query.item);
        if (open && state !== "empty")
          return <WorkForm role={role} work={open} query={query} />;
        return (
          <WorkList role={role} query={query} isEmpty={state === "empty"} />
        );
      }}
    </QFrame>
  );
}
