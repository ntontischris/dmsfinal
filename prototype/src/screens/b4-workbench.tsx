"use client";

import Link from "next/link";
import { useState } from "react";

import { ProposalPanel, type ProposalView } from "@/screens/b4-proposal";
import { Badge } from "@/screens/shared";

export interface OpportunityView {
  title: string;
  clientName: string;
  clientHref: string;
  owner: string;
  source: string;
  referredBy: string | null;
  stage: string;
  outcome: "Ανοιχτή" | "Κερδισμένη" | "Χαμένη";
  lostReason: string | null;
  nextStep: { text: string; due: string; isOverdue: boolean } | null;
  activities: readonly {
    when: string;
    kind: string;
    text: string;
    by: string;
  }[];
  proposal: ProposalView | null;
}

interface WorkbenchProps {
  view: OpportunityView;
  stages: readonly string[];
  lossReasons: readonly string[];
  canManage: boolean;
  canReassign: boolean;
  canApprove: boolean;
}

const KINDS = ["κλήση", "email", "συνάντηση", "σημείωση"] as const;

export function OpportunityWorkbench({
  view,
  stages,
  lossReasons,
  canManage,
  canReassign,
  canApprove,
}: WorkbenchProps) {
  const [stage, setStage] = useState(view.stage);
  const [outcome, setOutcome] = useState(view.outcome);
  const [lostReason, setLostReason] = useState(view.lostReason);
  const [activities, setActivities] = useState(view.activities);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("κλήση");
  const [text, setText] = useState("");
  const isOpen = outcome === "Ανοιχτή";

  const addActivity = () => {
    if (!text.trim()) return;
    setActivities([
      { when: "20/09/2026", kind, text: text.trim(), by: "Εγώ" },
      ...activities,
    ]);
    setText("");
  };
  const loseWith = (reason: string) => {
    setOutcome("Χαμένη");
    setLostReason(reason);
  };

  return (
    <>
      <section className="card">
        <div className="card-title">
          <h2>{view.title}</h2>
          <span className="btn-row">
            <Badge tone="strong">{outcome}</Badge>
            {lostReason && outcome === "Χαμένη" && (
              <Badge>Λόγος απώλειας: {lostReason}</Badge>
            )}
          </span>
        </div>
        <dl className="dl">
          <dt>Πελάτης</dt>
          <dd>
            <Link href={view.clientHref}>{view.clientName}</Link>
          </dd>
          <dt>Στάδιο</dt>
          <dd>
            {isOpen && canManage ? (
              <select
                className="select"
                aria-label="Στάδιο"
                value={stage}
                onChange={(event) => setStage(event.target.value)}
              >
                {stages.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            ) : (
              stage
            )}
          </dd>
          <dt>Υπεύθυνος</dt>
          <dd>
            {view.owner}{" "}
            {canReassign && (
              <button type="button" className="button">
                Μεταβίβαση
              </button>
            )}
          </dd>
          <dt>Πηγή</dt>
          <dd>
            {view.source}
            {view.referredBy && ` (σύσταση από ${view.referredBy})`}
          </dd>
          <dt>Επόμενο βήμα</dt>
          <dd>
            {view.nextStep ? (
              <>
                {view.nextStep.text}, {view.nextStep.due}{" "}
                {view.nextStep.isOverdue && isOpen && (
                  <Badge tone="attention">Ξεχασμένη</Badge>
                )}
              </>
            ) : (
              isOpen && (
                <Badge tone="attention">
                  Δεν έχει οριστεί (είναι υποχρεωτικό)
                </Badge>
              )
            )}{" "}
            {isOpen && canManage && (
              <button type="button" className="button">
                Αλλαγή
              </button>
            )}
          </dd>
        </dl>
        {isOpen && canManage && view.proposal === null && (
          <button type="button" className="button" data-primary="true">
            Νέα πρόταση
          </button>
        )}
        {outcome === "Κερδισμένη" && (
          <p className="note">
            Κερδισμένη με την υπογραφή του Υπογράφοντα. Δεν αλλάζει με το χέρι.
          </p>
        )}
      </section>

      {view.proposal ? (
        <ProposalPanel
          initial={view.proposal}
          canApprove={canApprove}
          canManage={canManage && isOpen}
          lossReasons={lossReasons}
          onLost={loseWith}
        />
      ) : (
        <section className="card">
          <h2>Πρόταση</h2>
          <p className="muted">
            Δεν υπάρχει πρόταση ακόμα. Γραμμές, Όροι, Υπογράφων και Ισχύς
            μπαίνουν στη Σύνταξη.
          </p>
        </section>
      )}

      <section className="card">
        <h2>Δραστηριότητες</h2>
        {isOpen && canManage && (
          <div className="toolbar">
            <select
              className="select"
              aria-label="Είδος Δραστηριότητας"
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as (typeof KINDS)[number])
              }
            >
              {KINDS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <input
              className="input grow"
              placeholder="Τι έγινε;"
              aria-label="Κείμενο Δραστηριότητας"
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <button type="button" className="button" onClick={addActivity}>
              Καταγραφή
            </button>
          </div>
        )}
        {activities.length === 0 ? (
          <p className="muted">Καμία Δραστηριότητα ακόμα.</p>
        ) : (
          <ul className="list">
            {activities.map((activity) => (
              <li key={`${activity.when}-${activity.text}`}>
                <span className="muted">
                  {activity.when} · {activity.kind} · {activity.by}
                </span>
                <br />
                {activity.text}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
