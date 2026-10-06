"use client";

import { useState } from "react";

import type { Filming } from "@/data/filming";
import {
  clientNameOf,
  endTime,
  needsOutcome,
  productionOf,
  type FilmingCaps,
} from "@/data/filming-access";
import type { RoleId } from "@/data/roles";
import { E3Actions } from "@/screens/e3-actions";
import { E3ClientActions } from "@/screens/e3-client";
import { E3Crew, E3Equipment } from "@/screens/e3-crew";
import {
  fmtDay,
  hoursLabel,
  initialLive,
  liveBalance,
  termsOf,
  type Live,
} from "@/screens/e3-model";
import { E3History, E3Sheet } from "@/screens/e3-sheet";
import { Badge, fmtDate } from "@/screens/shared";

interface Props {
  role: RoleId;
  caps: FilmingCaps;
  initial: Filming;
}

function Header({ live, caps }: { live: Live; caps: FilmingCaps }) {
  const f = live.filming;
  const production = productionOf(f);
  const isAttention = f.state === "αναμένει έγκριση" || needsOutcome(f);
  return (
    <section className="card">
      <div className="card-title">
        <h2>
          {clientNameOf(f)} — {production?.title ?? "—"}
        </h2>
        <Badge tone={isAttention ? "attention" : "strong"}>{f.state}</Badge>
      </div>
      <dl className="dl">
        <dt>Πότε</dt>
        <dd>
          {fmtDay(f.date)}, {f.start}–{endTime(f)} ({hoursLabel(f.hours)})
        </dd>
        <dt>Πού</dt>
        <dd>{f.location}</dd>
        {live.reschedule && (
          <>
            <dt>Μετάθεση</dt>
            <dd>
              Ζητήθηκε {fmtDay(live.reschedule.date)} {live.reschedule.start}·
              περιμένει έγκριση, η παλιά ώρα κρατιέται
            </dd>
          </>
        )}
        {f.clientNote && (
          <>
            <dt>Σημείωση πελάτη</dt>
            <dd>{f.clientNote}</dd>
          </>
        )}
        {caps.canSeeInternal && (
          <>
            <dt>Προέλευση</dt>
            <dd>{f.origin}</dd>
            <dt>Δημιουργία</dt>
            <dd>
              {f.createdBy}, {fmtDate(f.createdAt)}
            </dd>
            <dt>Έγκριση</dt>
            <dd>
              {f.approval
                ? `${f.approval.by}, ${fmtDate(f.approval.when)}${f.approval.automatic ? " (αυτόματη)" : ""}`
                : f.rejection
                  ? `Απορρίφθηκε από ${f.rejection.by}: ${f.rejection.reason}`
                  : "Δεν έχει εγκριθεί ακόμα"}
            </dd>
          </>
        )}
        {f.outcome?.actualHours !== undefined && caps.canSeeInternal && (
          <>
            <dt>Πραγματική διάρκεια</dt>
            <dd>{hoursLabel(f.outcome.actualHours)}</dd>
          </>
        )}
        {f.state === "απορρίφθηκε" && !caps.canSeeInternal && f.rejection && (
          <>
            <dt>Λόγος απόρριψης</dt>
            <dd>{f.rejection.reason}</dd>
          </>
        )}
      </dl>
    </section>
  );
}

function Balance({
  live,
  initial,
  isClient,
}: {
  live: Live;
  initial: Filming;
  isClient: boolean;
}) {
  const balance = liveBalance(initial, live.filming);
  if (!balance) return null;
  const terms = termsOf(initial);
  return (
    <section className="card">
      <div className="card-title">
        <h2>Παροχή «Γύρισμα»</h2>
        <span className="muted">{balance.periodLabel}</span>
      </div>
      <div className="e3-balance">
        {!isClient && (
          <>
            <div>
              <strong>{balance.total}</strong>σύνολο
            </div>
            <div>
              <strong>{balance.used}</strong>καταναλωμένα
            </div>
            <div>
              <strong>{balance.reserved}</strong>δεσμευμένα
            </div>
          </>
        )}
        <div>
          <strong>{balance.left}</strong>υπόλοιπα
        </div>
      </div>
      <p className="muted">
        Η Παροχή δεσμεύεται από τη στιγμή της κράτησης και καταναλώνεται όταν το
        Γύρισμα σημειωθεί «έγινε». Αν ακυρωθεί εγκαίρως ή απορριφθεί,
        επιστρέφει.
        {!isClient &&
          ` Όροι Συμφωνίας: Όριο ακύρωσης ${terms.cancelHours} ώρες, εκπρόθεσμη ακύρωση ${terms.lateCancelBurns ? "καίει" : "δεν καίει"}, «δεν έγινε» ${terms.noShowBurns ? "καίει" : "δεν καίει"}.`}
      </p>
    </section>
  );
}

export function E3Workbench({ role, caps, initial }: Props) {
  const [live, setLive] = useState<Live>(() => initialLive(initial));
  const update = (change: (current: Live) => Live) => setLive(change);
  const f = live.filming;

  return (
    <div className="e3">
      {!caps.isClient && needsOutcome(f) && (
        <section className="card e3-banner" role="status">
          <strong>Τελείωσε και δεν σημειώθηκε.</strong> Σημείωσε «έγινε» ή «δεν
          έγινε».
        </section>
      )}
      <Header live={live} caps={caps} />
      <Balance live={live} initial={initial} isClient={caps.isClient} />
      {caps.isClient ? (
        <E3ClientActions live={live} initial={initial} update={update} />
      ) : (
        <>
          <E3Actions
            role={role}
            caps={caps}
            live={live}
            initial={initial}
            update={update}
          />
          <E3Crew caps={caps} live={live} update={update} />
          <E3Equipment caps={caps} live={live} update={update} />
          <E3Sheet role={role} caps={caps} live={live} update={update} />
          <E3History live={live} />
        </>
      )}
    </div>
  );
}
