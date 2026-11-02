"use client";

import Link from "next/link";
import { Fragment, useState } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { Avatar, ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { decideDeliverableCharge } from "../actions-deliverable";
import { decideRequest } from "../actions-requests";
import type { DeliverableDetail, DeliverableRequest } from "../types";
import { ButtonForm, H2Form } from "./h2-form";
import { DECISION_WORDS, fmtDay, whoOf, type PanelProps } from "./h2-model";

import "./h1.css";

// Χρέωση και Αιτήματα μετά την έγκριση (prototype `screens/h2-money.tsx`). Στην εφαρμογή η χρέωση αφορά όλο το
// Παραδοτέο (η Παροχή δεν έφτανε), όχι έναν γύρο· ποιος και πότε αποφάσισε δεν το δίνει η βάση.

function ChargeDecided({ detail }: { detail: DeliverableDetail }) {
  return (
    <p className="note">
      {detail.charge === "charged"
        ? `Χρεώνεται${detail.chargeReason ? `: ${detail.chargeReason}` : ""}.`
        : `Χωρίς χρέωση: ${detail.chargeReason ?? ""}.`}
    </p>
  );
}

function ChargeChoices({ detail }: { detail: DeliverableDetail }) {
  const [isAsking, setIsAsking] = useState(false);
  return (
    <div className="stack">
      <div className="btn-row">
        <ButtonForm
          action={decideDeliverableCharge}
          label="Χρεώνεται"
          hidden={{ deliverableId: detail.id, charge: "charged" }}
          isPrimary
        />
        <button
          type="button"
          className="button"
          onClick={() => setIsAsking(true)}
        >
          Χωρίς χρέωση
        </button>
      </div>
      {isAsking && (
        <H2Form
          action={decideDeliverableCharge}
          submitLabel="Χωρίς χρέωση"
          hidden={{ deliverableId: detail.id, charge: "free" }}
          onSuccess={() => setIsAsking(false)}
          onClose={() => setIsAsking(false)}
        >
          <label>
            Λόγος (υποχρεωτικός)
            <input className="input" name="reason" required aria-required />
          </label>
        </H2Form>
      )}
    </div>
  );
}

export function H2Charge({ detail, ctx }: PanelProps) {
  if (detail.charge === "included") return null;
  const isPending = detail.charge === "pending";
  return (
    <Panel label="Απόφαση χρέωσης">
      <p>Η Παροχή δεν έφτανε για το Παραδοτέο. Η δουλειά δεν σταμάτησε.</p>
      {!isPending ? (
        <ChargeDecided detail={detail} />
      ) : detail.can.decideCharge ? (
        <ChargeChoices detail={detail} />
      ) : (
        !ctx.canSeeAmounts && (
          <p className="note">Η χρέωση αποφασίζεται από όποιον βλέπει ποσά.</p>
        )
      )}
    </Panel>
  );
}

function RequestDecided({ request }: { request: DeliverableRequest }) {
  if (!request.decision) return null;
  return (
    <>
      <p className="note">
        Απόφαση: {DECISION_WORDS[request.decision]} (
        {request.decidedByName ?? "—"}
        {request.decidedAt ? `, ${fmtDay(request.decidedAt)}` : ""}). Η έγκριση
        και ό,τι γέννησε μένουν.
        {request.decisionNote ? ` ${request.decisionNote}` : ""}
      </p>
      {request.newDeliverableId && (
        <Link href={hrefOf("H2", { id: request.newDeliverableId })}>
          Άνοιγμα του νέου Παραδοτέου
        </Link>
      )}
    </>
  );
}

// Η απόφαση με ένα πάτημα, όπως στο prototype. Το «Χρεώνεται» θέλει Δικαίωμα να βλέπεις ποσά (η βάση ξαναελέγχει).
function RequestChoices({
  id,
  canSeeAmounts,
}: {
  id: string;
  canSeeAmounts: boolean;
}) {
  const hiddenFor = (decision: string) => ({
    requestId: id,
    decision,
    note: "",
  });
  return (
    <div className="btn-row">
      <ButtonForm
        action={decideRequest}
        label="Δεκτό ως γύρος"
        hidden={hiddenFor("round")}
      />
      <ButtonForm
        action={decideRequest}
        label="Νέο Παραδοτέο"
        hidden={hiddenFor("new_deliverable")}
      />
      {canSeeAmounts && (
        <ButtonForm
          action={decideRequest}
          label="Χρεώνεται"
          hidden={hiddenFor("charged")}
        />
      )}
    </div>
  );
}

export function H2Requests({ detail, ctx }: PanelProps) {
  if (detail.requests.length === 0) return null;
  return (
    <Panel label="Αιτήματα αλλαγής μετά την έγκριση">
      <RowList>
        {detail.requests.map((r) => (
          <Fragment key={r.id}>
            <ListRow
              lead={<Avatar name={whoOf(r.createdByName)} size={32} />}
              title={whoOf(r.createdByName)}
              sub={fmtDay(r.createdAt)}
              aside={
                r.decision ? (
                  <Badge tone="ok">{DECISION_WORDS[r.decision]}</Badge>
                ) : undefined
              }
            />
            <li className="sx-extra">
              <p>{r.body}</p>
              {r.decision ? (
                <RequestDecided request={r} />
              ) : (
                <RequestChoices id={r.id} canSeeAmounts={ctx.canSeeAmounts} />
              )}
            </li>
          </Fragment>
        ))}
      </RowList>
    </Panel>
  );
}
