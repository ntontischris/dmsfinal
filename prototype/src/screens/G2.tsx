import Link from "next/link";

import { PERSON_OF_ROLE, findProduction, personName } from "@/data/filming";
import { deliverablesOf, tasksOf } from "@/data/productions";
import {
  agreementOf,
  canBeCancelled,
  canOpenProduction,
  clientNameOfProduction,
  deliveryBlockers,
  filmingsOf,
  isInternal,
  membersOf,
  productionCapsOf,
  recordOf,
} from "@/data/productions-access";
import { G2Live } from "@/screens/g2-live";
import { G2Extras, G2Messages, G2Trail } from "@/screens/g2-notes";
import type { Live } from "@/screens/g2-model";
import {
  G2ClientDeliverables,
  G2Deliverables,
  G2Filmings,
  G2Provisions,
} from "@/screens/g2-sections";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtMoney,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./g2.css";

const DEFAULT_ID = "pr-kypseli-09";

export function G2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = productionCapsOf(role);
  const production = findProduction(query.id ?? DEFAULT_ID);
  const switcher = (
    <StateSwitcher
      role={role}
      code="G2"
      state={state}
      keep={{ id: query.id }}
    />
  );

  if (!caps.canSee)
    return (
      <>
        {switcher}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Ο ρόλος σου δεν βλέπει Παραγωγές.</p>
        </StateNotice>
      </>
    );
  if (state === "error")
    return (
      <>
        {switcher}
        <ErrorNotice what="την Παραγωγή" />
      </>
    );
  if (!production)
    return (
      <>
        {switcher}
        <StateNotice kind="empty" title="Η Παραγωγή δεν βρέθηκε">
          <p>
            <Link href={screenHref(role, "G1", {})}>
              Πίσω στις Παραγωγές
            </Link>
          </p>
        </StateNotice>
      </>
    );
  if (!canOpenProduction(role, production))
    return (
      <>
        {switcher}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>
            {caps.isScoped
              ? `Δεν είσαι Μέλος αυτής της Παραγωγής. Ζήτησε από τον Υπεύθυνο (${personName(production.ownerId)}) να σε προσθέσει.`
              : "Βλέπεις μόνο τις Παραγωγές του δικού σου χώρου."}
          </p>
        </StateNotice>
      </>
    );

  const isEmpty = state === "empty";
  const record = recordOf(production);
  const allDeliverables = isEmpty ? [] : deliverablesOf(production.id);
  const filmings = isEmpty ? [] : filmingsOf(production);
  const tasks = isEmpty ? [] : tasksOf(production.id);
  const internal = isInternal(production);
  const agreement = agreementOf(production);
  const taskOpen = (id: string) =>
    tasks.filter((t) => t.assigneeId === id && !t.doneAt).length;
  const initial: Live = {
    ownerId: production.ownerId,
    members: membersOf(production).map((m) => ({
      ...m,
      baseOpen: m.openAssignments - taskOpen(m.personId),
    })),
    tasks,
    state: record.state,
    delivery: record.delivery,
    cancellation: record.cancellation,
    log: [],
  };
  const blockers = isEmpty
    ? ["δεν υπάρχει ακόμα Παραδοτέο"]
    : deliveryBlockers(production);

  return (
    <div className="g2">
      {switcher}
      <header className="g2-header">
        <h1>{production.title}</h1>
        <dl className="dl">
          <dt>Πελάτης</dt>
          <dd>
            {internal ? (
              "Εσωτερική Παραγωγή"
            ) : (
              <Link
                href={screenHref(role, "B2", { id: production.clientId })}
              >
                {clientNameOfProduction(production)}
              </Link>
            )}
          </dd>
          {agreement && (
            <>
              <dt>Συμφωνία</dt>
              <dd>
                <Link
                  href={screenHref(role, "D2", { id: agreement.id })}
                >
                  {agreement.title}
                </Link>{" "}
                · {production.periodLabel ?? "εφάπαξ"}
              </dd>
            </>
          )}
        </dl>
        {caps.canSeeCost && (
          <Link
            href={screenHref(role, "G3", { id: production.id })}
          >
            Κόστος και ώρες
          </Link>
        )}
      </header>
      <G2Live
        caps={caps}
        initial={initial}
        meId={PERSON_OF_ROLE[role] ?? production.ownerId}
        blockers={blockers}
        canBeCancelled={canBeCancelled(production)}
        after={
          <>
            <G2Messages role={role} production={production} />
            {caps.canSeeAmounts && (
              <G2Extras extras={record.extras} fmt={fmtMoney} />
            )}
            {!caps.isClient && (
              <G2Trail trail={record.trail} canSeeCost={caps.canSeeCost} />
            )}
          </>
        }
      >
        <G2Provisions production={production} deliverables={allDeliverables} />
        <G2Filmings role={role} caps={caps} filmings={filmings} />
        {caps.isClient ? (
          <G2ClientDeliverables role={role} deliverables={allDeliverables} />
        ) : (
          <G2Deliverables
            role={role}
            caps={caps}
            production={production}
            deliverables={allDeliverables}
          />
        )}
      </G2Live>
    </div>
  );
}
