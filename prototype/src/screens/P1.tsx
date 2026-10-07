import Link from "next/link";

import { AUDIT } from "@/data/audit";
import { settingsCapsOf } from "@/data/settings-access";
import {
  AuditFilterBar,
  applyFilters,
  readFilters,
} from "@/screens/p1-filters";
import { AuditTable } from "@/screens/p1-table";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./p1.css";

// P1 «Ίχνος ενεργειών»: μόνο προσθήκη, φιλτράρεται από τη διεύθυνση.
export function P1({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = settingsCapsOf(role);
  const keep = { ...query, state: undefined };
  const header = (
    <StateSwitcher role={role} code="P1" state={state} keep={keep} />
  );
  if (!caps.seesAudit) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Το Ίχνος ενεργειών το βλέπει όποιος έχει το «Βλέπει ίχνος ενεργειών».
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="το Ίχνος ενεργειών" />
      </>
    );
  }
  const all = state === "empty" ? [] : AUDIT;
  const filters = readFilters(query);
  const rows = applyFilters(all, filters);
  const isFiltered = Object.values(filters).some(Boolean);
  const actors = [...new Set(AUDIT.map((e) => e.actor))];
  const actions = [...new Set(AUDIT.map((e) => e.action))];
  return (
    <>
      {header}
      <p className="note">
        Μόνο προσθήκη: καμία γραμμή δεν διορθώνεται ή σβήνεται. Κρατιέται όσο
        υπάρχει το σύστημα· με ανωνυμοποίηση GDPR το όνομα γίνεται
        «Ανωνυμοποιημένος Χρήστης».
      </p>
      <AuditFilterBar
        role={role}
        query={query}
        filters={filters}
        actors={actors}
        actions={actions}
      />
      {caps.canExport && (
        <div className="btn-row">
          <Link
            className="button"
            href={screenHref(role, "P1", { ...query, export: "1" })}
          >
            Εξαγωγή
          </Link>
        </div>
      )}
      {caps.canExport && query.export === "1" && (
        <p className="note" role="status">
          Εξαγωγή σε Excel ή CSV μόνο όσων βλέπεις, με τα τρέχοντα φίλτρα·
          γράφεται κι αυτή στο Ίχνος.
        </p>
      )}
      {all.length === 0 ? (
        <StateNotice kind="empty" title="Καμία ενέργεια ακόμα">
          Μόλις γίνει η πρώτη αλλαγή στο σύστημα, θα εμφανιστεί εδώ.
        </StateNotice>
      ) : rows.length === 0 && isFiltered ? (
        <StateNotice kind="empty" title="Κανένα αποτέλεσμα με αυτά τα φίλτρα">
          <Link href={screenHref(role, "P1", { state: query.state })}>
            Καθαρισμός φίλτρων
          </Link>
        </StateNotice>
      ) : (
        <AuditTable role={role} caps={caps} entries={rows} />
      )}
    </>
  );
}
