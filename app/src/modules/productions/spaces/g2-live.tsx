"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Person } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import {
  cancelProduction,
  deliverProduction,
  reopenProduction,
} from "../actions-state";
import { transferProduction } from "../actions-team";
import type {
  OwnerCandidate,
  ProductionState,
  ProductionViewerCan,
} from "../types";
import type { StateStory } from "./g2-model";
import { ReasonForm, RunResult, useRun } from "./g2-ui";

export interface G2StateProps {
  productionId: string;
  state: ProductionState;
  stateWord: string;
  owner: { id: string | null; name: string } | null;
  ownerChoices: readonly OwnerCandidate[];
  can: ProductionViewerCan;
  blockers: readonly string[];
  delivery: StateStory | null;
  cancellation: StateStory | null;
}

type Dialog = "deliver" | "cancel" | "reopen" | null;

const whoText = (by: string): string =>
  by === "σύστημα" ? "από το σύστημα" : `χειροκίνητα από ${by}`;

function StateBlock({
  state,
  blockers,
  delivery,
  cancellation,
}: Pick<G2StateProps, "state" | "blockers" | "delivery" | "cancellation">) {
  if (state === "open")
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
  if (state === "cancelled")
    return (
      <p className="muted">
        Ακυρώθηκε στις {cancellation?.when ?? "—"} από {cancellation?.by ?? "—"}
        . Λόγος: {cancellation?.text}
      </p>
    );
  return (
    <div className="stack">
      <p className="muted">
        Παραδόθηκε στις {delivery?.when ?? "—"} (
        {whoText(delivery?.by ?? "σύστημα")}).
        {delivery?.text ? ` Σχόλιο: ${delivery.text}` : ""}
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

// Παράδοση χειροκίνητα, ακύρωση (prototype) και επανάνοιγμα (της εφαρμογής). Τι επιτρέπεται το λέει η βάση (viewerCan).
function Actions({
  productionId,
  can,
}: Pick<G2StateProps, "productionId" | "can">) {
  const [dialog, setDialog] = useState<Dialog>(null);
  const deliver = useRun(deliverProduction);
  const cancel = useRun(cancelProduction);
  const reopen = useRun(reopenProduction);
  const isPending = deliver.isPending || cancel.isPending || reopen.isPending;
  const close = () => setDialog(null);
  const closeOnSuccess = (state: { error?: string }) => {
    if (!state.error) close();
  };
  if (!can.deliver && !can.cancel && !can.reopen) return null;
  return (
    <div className="stack">
      <div className="btn-row">
        {can.deliver && (
          <button
            type="button"
            className="button"
            onClick={() => setDialog("deliver")}
          >
            Παράδοση χειροκίνητα
          </button>
        )}
        {can.reopen && (
          <button
            type="button"
            className="button"
            onClick={() => setDialog("reopen")}
          >
            Επανάνοιγμα
          </button>
        )}
        {can.cancel && (
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
      {dialog === "deliver" && (
        <ReasonForm
          label="Σχόλιο παράδοσης (υποχρεωτικό)"
          confirmLabel="Παράδοση"
          isPending={isPending}
          onConfirm={(note) =>
            deliver.run({ productionId, note }, closeOnSuccess)
          }
          onClose={close}
        />
      )}
      {dialog === "reopen" && (
        <ReasonForm
          label="Λόγος επανανοίγματος (υποχρεωτικός)"
          confirmLabel="Επανάνοιγμα"
          isPending={isPending}
          onConfirm={(reason) =>
            reopen.run({ productionId, reason }, closeOnSuccess)
          }
          onClose={close}
        />
      )}
      {dialog === "cancel" && (
        <ReasonForm
          label="Λόγος ακύρωσης (υποχρεωτικός)"
          confirmLabel="Ακύρωση Παραγωγής"
          isDanger
          isPending={isPending}
          onConfirm={(reason) =>
            cancel.run({ productionId, reason }, closeOnSuccess)
          }
          onClose={close}
        />
      )}
      <RunResult result={deliver.result} />
      <RunResult result={reopen.result} />
      <RunResult result={cancel.result} />
    </div>
  );
}

// Ο Υπεύθυνος με «Αλλαγή»: η επιλογή μεταβιβάζει αμέσως (μόνο σε όποιον έχει Εύρος «όλα»).
function OwnerField({
  productionId,
  owner,
  ownerChoices,
  can,
}: Pick<G2StateProps, "productionId" | "owner" | "ownerChoices" | "can">) {
  const [isChanging, setIsChanging] = useState(false);
  const transfer = useRun(transferProduction);
  const canChange = can.transfer && ownerChoices.length > 0;
  return (
    <>
      {!canChange || !isChanging ? (
        <span className="row">
          <Person name={owner?.name ?? "Χωρίς υπεύθυνο"} />
          {canChange && (
            <button
              type="button"
              className="button"
              onClick={() => setIsChanging(true)}
            >
              Αλλαγή
            </button>
          )}
        </span>
      ) : (
        <select
          className="select"
          aria-label="Νέος Υπεύθυνος"
          defaultValue=""
          disabled={transfer.isPending}
          onChange={(event) =>
            transfer.run({ productionId, ownerId: event.target.value }, () =>
              setIsChanging(false),
            )
          }
        >
          <option value="" disabled>
            Διάλεξε Υπεύθυνο…
          </option>
          {ownerChoices.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      )}
      <RunResult result={transfer.result} />
    </>
  );
}

// Το πάνελ «Κατάσταση» του prototype (`g2-live.tsx`), όψη ομάδας.
export function G2State(props: G2StateProps) {
  return (
    <Panel
      label="Κατάσταση"
      aside={
        <Badge tone={props.state === "cancelled" ? "faded" : "strong"}>
          {props.stateWord}
        </Badge>
      }
    >
      <dl className="dl">
        <dt>Υπεύθυνος</dt>
        <dd>
          <OwnerField {...props} />
        </dd>
      </dl>
      <StateBlock {...props} />
      <Actions productionId={props.productionId} can={props.can} />
    </Panel>
  );
}
