"use client";

import { useState } from "react";

import { CREW_PEOPLE, personName } from "@/data/filming";
import type { ProductionCaps } from "@/data/productions-access";
import {
  isMemberOf,
  openCountOf,
  removeMember,
  withLog,
  type Live,
  type LiveMember,
  type UpdateLive,
} from "@/screens/g2-model";

interface G2MembersProps {
  caps: ProductionCaps;
  live: Live;
  update: UpdateLive;
}

function MemberRow({
  member,
  live,
  caps,
  update,
}: G2MembersProps & { member: LiveMember }) {
  const [isAsking, setIsAsking] = useState(false);
  const open = openCountOf(live, member);
  const isOwner = member.personId === live.ownerId;
  const remove = () => {
    update((l) => removeMember(l, member.personId));
    setIsAsking(false);
  };
  return (
    <li className="g2-row">
      <div className="row">
        <strong>{personName(member.personId)}</strong>
        <span className="g2-signals">
          <span className="badge">{member.reason}</span>
          <span className="muted">{open} ανοιχτές αναθέσεις</span>
          {caps.canManage && !isOwner && (
            <button
              type="button"
              className="button"
              onClick={() => (open > 0 ? setIsAsking(true) : remove())}
            >
              Αφαίρεση
            </button>
          )}
        </span>
      </div>
      {caps.canManage && isOwner && (
        <span className="muted">
          Ο Υπεύθυνος δεν αφαιρείται· άλλαξε πρώτα τον Υπεύθυνο.
        </span>
      )}
      {isAsking && (
        <div className="g2-warn">
          <p>
            Οι {open} ανοιχτές αναθέσεις του πάνε στον Υπεύθυνο (
            {personName(live.ownerId)}).
          </p>
          <div className="btn-row">
            <button
              type="button"
              className="button"
              data-danger
              onClick={remove}
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
    </li>
  );
}

function AddMember({ live, update }: Pick<G2MembersProps, "live" | "update">) {
  const candidates = CREW_PEOPLE.filter((p) => !isMemberOf(live, p.id));
  const [picked, setPicked] = useState("");
  if (candidates.length === 0) return null;
  const chosen = candidates.some((p) => p.id === picked) ? picked : "";
  const add = () =>
    update((l) =>
      withLog(
        {
          ...l,
          members: [
            ...l.members,
            {
              personId: chosen,
              reason: "με το χέρι",
              openAssignments: 0,
              baseOpen: 0,
            },
          ],
        },
        `Προστέθηκε Μέλος με το χέρι: ${personName(chosen)}.`,
      ),
    );
  return (
    <div className="g2-add">
      <select
        className="select"
        aria-label="Νέο Μέλος"
        value={chosen}
        onChange={(event) => setPicked(event.target.value)}
      >
        <option value="">Διάλεξε άτομο…</option>
        {candidates.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button type="button" className="button" disabled={!chosen} onClick={add}>
        Προσθήκη Μέλους
      </button>
    </div>
  );
}

export function G2Members(props: G2MembersProps) {
  const { live, caps, update } = props;
  return (
    <section className="card">
      <div className="card-title">
        <h2>Μέλη</h2>
        <span className="muted">{live.members.length} άτομα</span>
      </div>
      <p className="muted">
        Όποιος αφαιρείται χάνει αμέσως την πρόσβαση στην Παραγωγή.
      </p>
      <ul className="list">
        {live.members.map((m) => (
          <MemberRow
            key={m.personId}
            member={m}
            live={live}
            caps={caps}
            update={update}
          />
        ))}
      </ul>
      {caps.canManage && <AddMember live={live} update={update} />}
    </section>
  );
}
