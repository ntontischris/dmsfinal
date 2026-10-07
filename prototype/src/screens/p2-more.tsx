import Link from "next/link";

import {
  ASSISTANT_CAP,
  FAILED_SENDS,
  GOOGLE_SYNC,
  STUCK_EVENTS,
} from "@/data/health";
import { fmtDateTime } from "@/screens/n5-integrations";
import { HealthCard, RedNote } from "@/screens/p2-parts";
import { fmtPercent, screenHref, type ScreenProps } from "@/screens/shared";

// Ενέργειες (?act=resend|ignore|retry): όποιος βλέπει την P2 τις κάνει, γράφονται στο Ίχνος.
const ACT_DONE: Readonly<Record<string, string>> = {
  resend: "Η αποστολή ξαναστάλθηκε",
  ignore: "Η αποστολή αγνοήθηκε",
  retry: "Το Γεγονός ξαναδοκιμάστηκε",
};

export function ActionNote({ act }: { act?: string }) {
  if (!act || !(act in ACT_DONE)) return null;
  return (
    <p className="note" role="status">
      {ACT_DONE[act]}. Η ενέργεια γράφεται στο Ίχνος.
    </p>
  );
}

export function FailedSendsCard({ role, query }: ScreenProps) {
  const resolved = query.act === "resend" || query.act === "ignore";
  const items = resolved ? [] : FAILED_SENDS;
  return (
    <HealthCard title="Αποστολές που απέτυχαν οριστικά" red={items.length > 0}>
      {items.length === 0 ? (
        <p className="muted">Καμία αποστολή δεν έχει αποτύχει οριστικά.</p>
      ) : (
        <ul className="p2-list">
          {items.map((s) => (
            <li key={s.id}>
              <strong>«{s.what}»</strong> προς {s.to}
              <div className="muted">
                {fmtDateTime(s.at)} · λόγος: {s.reason}
              </div>
              <div className="btn-row">
                <Link
                  className="button"
                  data-primary="true"
                  href={screenHref(role, "P2", { ...query, act: "resend" })}
                >
                  Ξαναστείλε
                </Link>
                <Link
                  className="button"
                  href={screenHref(role, "P2", { ...query, act: "ignore" })}
                >
                  Αγνόησε
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && (
        <>
          <p className="note">
            Και οι δύο επιλογές γράφονται στο Ίχνος, με το όνομά σου.
          </p>
          <RedNote event={51} />
        </>
      )}
    </HealthCard>
  );
}

export function GoogleSyncCard() {
  return (
    <HealthCard title="Συγχρονισμός Google">
      <dl>
        <dt className="muted">Τελευταίος συγχρονισμός</dt>
        <dd>{fmtDateTime(GOOGLE_SYNC.lastSync)}</dd>
        <dt className="muted">Αλλαγές σε ουρά</dt>
        <dd>{GOOGLE_SYNC.queued}</dd>
      </dl>
      <p className="muted">
        Γίνεται κόκκινο αν ο συγχρονισμός αποτυγχάνει για πάνω από 1 ώρα
        (Γεγονός 52).
      </p>
    </HealthCard>
  );
}

export function StuckEventsCard({ role, query }: ScreenProps) {
  const items =
    query.stuck === "1" && query.act !== "retry" ? STUCK_EVENTS : [];
  return (
    <HealthCard title="Γεγονότα που κόλλησαν" red={items.length > 0}>
      {items.length === 0 ? (
        <p className="muted">Κανένα (0). Όλα τα Γεγονότα επεξεργάστηκαν.</p>
      ) : (
        <ul className="p2-list">
          {items.map((e) => (
            <li key={e.id}>
              {e.name}
              <div className="muted">από {fmtDateTime(e.since)}</div>
              <Link
                className="button"
                href={screenHref(role, "P2", { ...query, act: "retry" })}
              >
                Ξαναδοκίμασε
              </Link>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && <RedNote event={53} />}
    </HealthCard>
  );
}

export function AssistantCapCard({ role, query }: ScreenProps) {
  const { used, limit, widgetStopsAt } = ASSISTANT_CAP;
  const share = used / limit;
  const money = (v: number) => `$${v.toFixed(2).replace(".", ",")}`;
  return (
    <HealthCard title="Πλαφόν Βοηθού">
      <p>
        {money(used)} από ${limit} αυτόν τον μήνα ({fmtPercent(share)}).
      </p>
      <div
        className="p2-bar"
        role="progressbar"
        aria-valuenow={Math.round(share * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${share * 100}%` }} />
      </div>
      <p className="muted">
        Στο {fmtPercent(widgetStopsAt)} σταματά το widget του Πελάτη, στο 100%
        σταματά και ο εσωτερικός Βοηθός. Ειδοποίηση και email και στις δύο
        περιπτώσεις (Γεγονός 57).
      </p>
      <div className="btn-row">
        <Link href={screenHref(role, "O1", {})}>Όρια στις Ρυθμίσεις (O1)</Link>
        {role === "owner" && (
          <Link href={screenHref(role, "N5", {})}>
            Χρήση και συνδρομές (N5)
          </Link>
        )}
      </div>
    </HealthCard>
  );
}
