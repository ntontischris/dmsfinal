"use client";

import { useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { Avatar } from "@/spaces/kit/parts";

import { addProductionMember, removeProductionMember } from "../actions-team";
import type { OwnerCandidate } from "../types";
import { countLabel, type MemberRow } from "./g2-model";
import { RunResult, useRun } from "./g2-ui";

interface G2MembersProps {
  productionId: string;
  members: readonly MemberRow[];
  ownerName: string;
  choices: readonly OwnerCandidate[];
  canManage: boolean;
}

function MemberLine({
  member,
  productionId,
  ownerName,
  canManage,
}: Omit<G2MembersProps, "members" | "choices"> & { member: MemberRow }) {
  const [isAsking, setIsAsking] = useState(false);
  const remove = useRun(removeProductionMember);
  const handleRemove = () =>
    remove.run({ productionId, userId: member.userId }, (state) => {
      if (!state.error) setIsAsking(false);
    });
  return (
    <li className="g2-member">
      <div className="g2-member-line">
        <span className="g2-member-who">
          <Avatar name={member.name} size={32} />
          <span className="g2-member-text">
            <strong>{member.name}</strong>
            <span className="part-sub">
              {countLabel(member.open, "ανοιχτή ανάθεση", "ανοιχτές αναθέσεις")}
            </span>
          </span>
        </span>
        <span className="g2-signals">
          <span className="badge">{member.reason}</span>
          {canManage && !member.isOwner && (
            <button
              type="button"
              className="button"
              disabled={remove.isPending}
              onClick={() =>
                member.open > 0 ? setIsAsking(true) : handleRemove()
              }
            >
              Αφαίρεση
            </button>
          )}
        </span>
      </div>
      {canManage && member.isOwner && (
        <span className="muted">
          Ο Υπεύθυνος δεν αφαιρείται· άλλαξε πρώτα τον Υπεύθυνο.
        </span>
      )}
      {isAsking && (
        <div className="g2-warn">
          <p>
            {member.open === 1
              ? "Η ανοιχτή ανάθεσή του πάει"
              : `Οι ${member.open} ανοιχτές αναθέσεις του πάνε`}{" "}
            στον Υπεύθυνο ({ownerName}).
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-danger
              disabled={remove.isPending}
              onClick={handleRemove}
            >
              Αφαίρεση και μεταφορά
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setIsAsking(false)}
            >
              Άκυρο
            </button>
          </div>
        </div>
      )}
      {remove.result.error && <RunResult result={remove.result} />}
    </li>
  );
}

function AddMember({
  productionId,
  choices,
}: Pick<G2MembersProps, "productionId" | "choices">) {
  const [picked, setPicked] = useState("");
  const add = useRun(addProductionMember);
  if (choices.length === 0) return null;
  const chosen = choices.some((person) => person.id === picked) ? picked : "";
  return (
    <>
      <div className="g2-add">
        <select
          className="select"
          aria-label="Νέο Μέλος"
          value={chosen}
          onChange={(event) => setPicked(event.target.value)}
        >
          <option value="">Διάλεξε άτομο…</option>
          {choices.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button"
          disabled={!chosen || add.isPending}
          onClick={() =>
            add.run({ productionId, userId: chosen }, (state) => {
              if (!state.error) setPicked("");
            })
          }
        >
          Προσθήκη Μέλους
        </button>
      </div>
      <RunResult result={add.result} />
    </>
  );
}

// Τα Μέλη της Παραγωγής (prototype `g2-members.tsx`): ο Υπεύθυνος και όσοι προστέθηκαν. Η αφαίρεση μεταφέρει τις ανοιχτές
// αναθέσεις στον Υπεύθυνο (το κάνει η βάση).
export function G2Members(props: G2MembersProps) {
  const { members, canManage } = props;
  return (
    <Panel label="Μέλη" aside={countLabel(members.length, "άτομο", "άτομα")}>
      <p className="muted">
        Όποιος αφαιρείται χάνει αμέσως την πρόσβαση στην Παραγωγή.
      </p>
      <ul className="g2-members">
        {members.map((member) => (
          <MemberLine key={member.userId} member={member} {...props} />
        ))}
      </ul>
      {canManage && <AddMember {...props} />}
    </Panel>
  );
}
