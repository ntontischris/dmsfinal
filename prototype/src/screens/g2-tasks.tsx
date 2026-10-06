"use client";

import { useState } from "react";

import { CREW_PEOPLE, personName } from "@/data/filming";
import type { ProductionCaps } from "@/data/productions-access";
import {
  TODAY,
  isMemberOf,
  withLog,
  withMember,
  type Live,
  type UpdateLive,
} from "@/screens/g2-model";
import { fmtDate } from "@/screens/shared";

interface G2TasksProps {
  caps: ProductionCaps;
  live: Live;
  update: UpdateLive;
  meId: string;
}

function AddTask({ live, update, meId }: Omit<G2TasksProps, "caps">) {
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState(meId);
  const [due, setDue] = useState("");
  const add = () => {
    const becomesMember = !isMemberOf(live, assignee);
    update((l) =>
      withLog(
        withMember(
          {
            ...l,
            tasks: [
              ...l.tasks,
              {
                id: `t-new-${l.tasks.length + 1}`,
                productionId: "",
                title: title.trim(),
                assigneeId: assignee,
                due: due || undefined,
              },
            ],
          },
          assignee,
        ),
        `Νέα εργασία «${title.trim()}» για ${personName(assignee)}${becomesMember ? " (έγινε Μέλος με την ανάθεση)" : ""}. Ο Ανατεθειμένος ειδοποιείται.`,
      ),
    );
    setTitle("");
    setDue("");
  };
  return (
    <div className="g2-add">
      <input
        className="input"
        placeholder="Τίτλος εργασίας (υποχρεωτικός)"
        aria-label="Τίτλος εργασίας"
        aria-required
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <select
        className="select"
        aria-label="Ανατεθειμένος"
        value={assignee}
        onChange={(event) => setAssignee(event.target.value)}
      >
        {CREW_PEOPLE.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <input
        className="input"
        type="date"
        aria-label="Προθεσμία (προαιρετική)"
        value={due}
        onChange={(event) => setDue(event.target.value)}
      />
      <button
        type="button"
        className="button"
        disabled={title.trim() === ""}
        onClick={add}
      >
        Προσθήκη εργασίας
      </button>
      {!isMemberOf(live, assignee) && (
        <span className="muted">Θα γίνει Μέλος με την ανάθεση.</span>
      )}
    </div>
  );
}

export function G2Tasks({ caps, live, update, meId }: G2TasksProps) {
  const toggle = (id: string) =>
    update((l) => ({
      ...l,
      tasks: l.tasks.map((t) =>
        t.id === id ? { ...t, doneAt: t.doneAt ? undefined : TODAY } : t,
      ),
    }));
  return (
    <section className="card">
      <div className="card-title">
        <h2>Εργασίες</h2>
        <span className="muted">
          {live.tasks.filter((t) => !t.doneAt).length} ανοιχτές
        </span>
      </div>
      <p className="muted">
        Απλή εσωτερική υποχρέωση της Παραγωγής: τίτλος, ένας Ανατεθειμένος,
        προαιρετική προθεσμία, έγινε ή όχι. Ο πελάτης δεν τις βλέπει και δεν
        εμποδίζουν την παράδοση.
      </p>
      {live.tasks.length === 0 && (
        <p className="muted">Η Παραγωγή δεν έχει ακόμα εργασίες.</p>
      )}
      <ul className="list">
        {live.tasks.map((t) => (
          <li key={t.id} className="g2-row" data-done={!!t.doneAt}>
            <span className="g2-title">{t.title}</span>
            <div className="g2-signals">
              <span className="muted">{personName(t.assigneeId)}</span>
              {t.due && (
                <span className="muted">προθεσμία {fmtDate(t.due)}</span>
              )}
              {!t.doneAt && t.due && t.due < TODAY && (
                <span className="badge" data-tone="attention">
                  εκπρόθεσμη
                </span>
              )}
              {t.doneAt && (
                <span className="badge">έγινε {fmtDate(t.doneAt)}</span>
              )}
              {caps.canManage && (
                <button
                  type="button"
                  className="button"
                  onClick={() => toggle(t.id)}
                >
                  {t.doneAt ? "Ξανάνοιγμα" : "Έγινε"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {caps.canManage && <AddTask live={live} update={update} meId={meId} />}
    </section>
  );
}
