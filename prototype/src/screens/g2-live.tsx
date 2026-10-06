"use client";

import { useState, type ReactNode } from "react";

import { CREW_PEOPLE, personName } from "@/data/filming";
import type { ProductionCaps } from "@/data/productions-access";
import { G2Members } from "@/screens/g2-members";
import {
  TODAY,
  changeOwner,
  whoLabel,
  withLog,
  type Live,
  type UpdateLive,
} from "@/screens/g2-model";
import { G2Tasks } from "@/screens/g2-tasks";
import { ReasonForm } from "@/screens/g2-ui";
import { Badge, fmtDate } from "@/screens/shared";

interface G2LiveProps {
  caps: ProductionCaps;
  initial: Live;
  meId: string;
  blockers: readonly string[];
  canBeCancelled: boolean;
  children: ReactNode;
  after: ReactNode;
}

type Dialog = "deliver" | "cancel" | null;

function StateBlock({
  live,
  blockers,
}: {
  live: Live;
  blockers: readonly string[];
}) {
  if (live.state === "ανοιχτή")
    return (
      <p className="muted">
        Γίνεται παραδομένη μόνη της όταν{" "}
        {blockers.length > 0
          ? `λυθεί αυτό που λείπει: ${blockers.join(", ")}`
          : "ολοκληρωθούν όλα· τώρα δεν λείπει τίποτα"}
        . Η κατάσταση βγαίνει από τα Παραδοτέα και τα Γυρίσματα, δεν
        πληκτρολογείται.
      </p>
    );
  if (live.state === "ακυρωμένη")
    return (
      <p className="muted">
        Ακυρώθηκε στις {fmtDate(live.cancellation?.when ?? TODAY)} από{" "}
        {whoLabel(live.cancellation?.by ?? "σύστημα")}. Λόγος:{" "}
        {live.cancellation?.reason}
      </p>
    );
  const by = live.delivery?.by ?? "σύστημα";
  return (
    <div className="stack">
      <p className="muted">
        Παραδόθηκε στις {fmtDate(live.delivery?.when ?? TODAY)} (
        {by === "σύστημα"
          ? "από το σύστημα"
          : `χειροκίνητα από ${whoLabel(by)}`}
        ).{live.delivery?.comment ? ` Σχόλιο: ${live.delivery.comment}` : ""}
      </p>
      <p className="note">
        Αν ένα Αίτημα αλλαγής ξανανοίξει Παραδοτέο (δεκτό ως γύρος ή χρεώνεται),
        η Παραγωγή ξαναγίνεται ανοιχτή· το Τιμολογητέο παράδοσης και το email
        δεν ξαναβγαίνουν. Ένα «νέο Παραδοτέο» μπαίνει στην Παραγωγή της
        τρέχουσας Περιόδου.
      </p>
    </div>
  );
}

function Actions({
  caps,
  live,
  update,
  meId,
  canBeCancelled,
}: Pick<G2LiveProps, "caps" | "meId" | "canBeCancelled"> & {
  live: Live;
  update: UpdateLive;
}) {
  const [dialog, setDialog] = useState<Dialog>(null);
  if (!caps.canManage || live.state !== "ανοιχτή") return null;
  const close = () => setDialog(null);
  const deliver = (comment: string) => {
    update((l) =>
      withLog(
        {
          ...l,
          state: "παραδομένη",
          delivery: { when: TODAY, by: meId, comment },
        },
        "Παραδόθηκε χειροκίνητα. Ο πελάτης παίρνει email· όσοι βλέπουν κόστος παίρνουν υπενθύμιση για τις ώρες.",
      ),
    );
    close();
  };
  const cancel = (reason: string) => {
    update((l) =>
      withLog(
        {
          ...l,
          state: "ακυρωμένη" as const,
          cancellation: { when: TODAY, by: meId, reason },
        },
        "Η Παραγωγή ακυρώθηκε.",
      ),
    );
    close();
  };
  return (
    <div className="stack">
      <div className="btn-row">
        <button
          type="button"
          className="button"
          onClick={() => setDialog("deliver")}
        >
          Παράδοση χειροκίνητα
        </button>
        {caps.canCancel && canBeCancelled && (
          <button
            type="button"
            className="button"
            data-danger
            onClick={() => setDialog("cancel")}
          >
            Ακύρωση Παραγωγής
          </button>
        )}
      </div>
      {caps.canCancel && !canBeCancelled && (
        <p className="muted">
          Έχει δουλειά που έγινε· κλείνει με παράδοση χειροκίνητα.
        </p>
      )}
      {dialog === "deliver" && (
        <ReasonForm
          label="Σχόλιο παράδοσης (υποχρεωτικό)"
          confirmLabel="Παράδοση"
          onConfirm={deliver}
          onClose={close}
        />
      )}
      {dialog === "cancel" && (
        <ReasonForm
          label="Λόγος ακύρωσης (υποχρεωτικός)"
          confirmLabel="Ακύρωση Παραγωγής"
          isDanger
          onConfirm={cancel}
          onClose={close}
        />
      )}
    </div>
  );
}

function OwnerField({
  caps,
  live,
  update,
}: {
  caps: ProductionCaps;
  live: Live;
  update: UpdateLive;
}) {
  if (!caps.canManage) return <span>{personName(live.ownerId)}</span>;
  return (
    <select
      className="select"
      aria-label="Υπεύθυνος"
      value={live.ownerId}
      onChange={(event) => update((l) => changeOwner(l, event.target.value))}
    >
      {CREW_PEOPLE.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export function G2Live(props: G2LiveProps) {
  const { caps, initial, blockers, children, after, meId } = props;
  const [live, setLive] = useState<Live>(initial);
  const update: UpdateLive = (change) => setLive(change);
  const isTeam = !caps.isClient;
  return (
    <>
      <section className="card">
        <div className="card-title">
          <h2>Κατάσταση</h2>
          <Badge tone={live.state === "ακυρωμένη" ? "attention" : "strong"}>
            {live.state}
          </Badge>
        </div>
        <dl className="dl">
          <dt>Υπεύθυνος</dt>
          <dd>
            {isTeam ? (
              <OwnerField caps={caps} live={live} update={update} />
            ) : (
              `${personName(live.ownerId)} (η επαφή σου)`
            )}
          </dd>
        </dl>
        <StateBlock live={live} blockers={blockers} />
        {isTeam && <Actions {...props} live={live} update={update} />}
        {isTeam && (
          <p className="g2-memo">
            Οι αλλαγές ζουν μόνο στη μνήμη αυτής της σελίδας· χάνονται με
            ανανέωση.
          </p>
        )}
        {live.log.length > 0 && (
          <ul className="list">
            {live.log.map((line, index) => (
              <li key={`${index}-${line}`}>{line}</li>
            ))}
          </ul>
        )}
      </section>
      {children}
      {isTeam && (
        <G2Tasks caps={caps} live={live} update={update} meId={meId} />
      )}
      {isTeam && <G2Members caps={caps} live={live} update={update} />}
      {after}
    </>
  );
}
