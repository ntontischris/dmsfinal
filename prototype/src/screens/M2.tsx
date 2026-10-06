import Link from "next/link";

import { exportableDatasets, reportCapsOf } from "@/data/reports-access";
import { DatasetSection } from "@/screens/m2-dataset";
import { LogSection } from "@/screens/m2-log";
import { pickDataset, pickFormat, pickPeriod } from "@/screens/m2-model";
import { PackSection } from "@/screens/m2-pack";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./m2.css";

export function M2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = reportCapsOf(role);
  const keep = { ...query, state: undefined };
  const header = (
    <StateSwitcher role={role} code="M2" state={state} keep={keep} />
  );
  if (!caps.canExport) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Την Εξαγωγή την κάνουν όσοι έχουν «Εξάγει δεδομένα».
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="την Εξαγωγή" />
      </>
    );
  }
  if (state === "empty") {
    return (
      <>
        {header}
        <StateNotice
          kind="empty"
          title="Δεν υπάρχουν ακόμα δεδομένα για εξαγωγή"
        >
          Όταν καταχωριστούν Πελάτες, Τιμολόγια ή Εισπράξεις, θα μπορείς να τα
          βγάλεις εδώ.
        </StateNotice>
      </>
    );
  }
  const datasets = exportableDatasets(role);
  const dataset = pickDataset(datasets, query.dataset);
  return (
    <>
      {header}
      {caps.canSeeFinance && <PackSection role={role} query={keep} />}
      {dataset && (
        <DatasetSection
          role={role}
          query={keep}
          datasets={datasets}
          dataset={dataset}
          period={pickPeriod(query.period)}
          format={pickFormat(query.format)}
          canSeeCost={caps.canSeeCost}
        />
      )}
      <LogSection role={role} />
      <p className="note">
        Οι έτοιμες Αναφορές είναι στη{" "}
        <Link href={screenHref(role, "M1", {})}>Αναφορές (M1)</Link>.
      </p>
    </>
  );
}
