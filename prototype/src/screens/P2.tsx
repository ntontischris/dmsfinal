import Link from "next/link";

import { JOBS } from "@/data/health";
import { settingsCapsOf } from "@/data/settings-access";
import {
  ActionNote,
  AssistantCapCard,
  FailedSendsCard,
  GoogleSyncCard,
  StuckEventsCard,
} from "@/screens/p2-more";
import { ExternalCheckCard, JobsCard } from "@/screens/p2-parts";
import { DownView } from "@/screens/p2-down";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./p2.css";

// Πόσα στοιχεία θέλουν προσοχή τώρα (ίδια λογική με τις κάρτες).
const attentionCount = (query: ScreenProps["query"]): number => {
  const jobs = JOBS.filter((j) => j.failed).length;
  const sends = query.act === "resend" || query.act === "ignore" ? 0 : 1;
  const stuck = query.stuck === "1" && query.act !== "retry" ? 1 : 0;
  return jobs + sends + stuck;
};

// P2 «Υγεία συστήματος»: σύνοψη και έξι ενότητες.
export function P2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = settingsCapsOf(role);
  const keep = { ...query, state: undefined };
  const header = (
    <StateSwitcher role={role} code="P2" state={state} keep={keep} />
  );
  if (!caps.seesHealth) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Την Υγεία συστήματος τη βλέπει όποιος έχει το «Βλέπει Υγεία
          συστήματος».
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="την Υγεία συστήματος" />
      </>
    );
  }
  if (state === "empty") {
    return (
      <>
        {header}
        <StateNotice kind="empty" title="Το σύστημα είναι καινούργιο">
          Τίποτα δεν έχει τρέξει ακόμα. Μόλις τρέξει η πρώτη προγραμματισμένη
          εργασία ή αποστολή, θα φανεί εδώ.
        </StateNotice>
      </>
    );
  }
  if (query.view === "down") {
    return (
      <>
        {header}
        <DownView role={role} query={query} />
      </>
    );
  }
  const count = attentionCount(query);
  return (
    <>
      {header}
      <section
        className="card p2-banner"
        data-red={count > 0 ? "true" : undefined}
        role="status"
      >
        <h2>{count === 0 ? "Όλα λειτουργούν" : `${count} θέλουν προσοχή`}</h2>
        <p className="muted">
          Ό,τι κοκκινίζει στέλνει Ειδοποίηση και email και πρασινίζει μόνο του
          όταν διορθωθεί.
        </p>
      </section>
      <ActionNote act={query.act} />
      <ExternalCheckCard role={role} query={query} />
      <JobsCard />
      <FailedSendsCard role={role} query={query} />
      <GoogleSyncCard />
      <StuckEventsCard role={role} query={query} />
      <AssistantCapCard role={role} query={query} />
      {(query.act || query.stuck) && (
        <Link href={screenHref(role, "P2", { state: query.state })}>
          Επαναφορά εικόνας
        </Link>
      )}
    </>
  );
}
