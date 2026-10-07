import Link from "next/link";
import type { ReactNode } from "react";

import type { RoleId } from "@/data/roles";
import { TODAY } from "@/data/sales";
import type { Consent } from "@/data/website";
import { Badge, StateNotice, fmtDate, screenHref } from "@/screens/shared";

import "./w.css";

interface ConsentProps {
  role: RoleId;
  code: string;
  itemId: string;
  consent: Consent;
  subject: string; // «του πελάτη», «του ανθρώπου»
  isWork?: boolean;
  confirm?: string;
}

function History({ consent }: { consent: Consent }) {
  if (consent.history.length === 0)
    return <p className="q-hint">Δεν έχει καταγραφεί ακόμα Συναίνεση.</p>;
  return (
    <ul className="list q-hist">
      {[...consent.history].reverse().map((r) => (
        <li key={`${r.action}-${r.date}`} data-action={r.action}>
          <strong>{r.action === "δόθηκε" ? "Δόθηκε" : "Ανακλήθηκε"}</strong>{" "}
          {fmtDate(r.date)} · από {r.by} · πώς: {r.how}
          {r.attachment && <> · συνημμένο: {r.attachment}</>}
        </li>
      ))}
    </ul>
  );
}

function RecordForm({ subject }: { subject: string }) {
  return (
    <form className="stack" aria-label="Καταγραφή Συναίνεσης">
      <h3>Καταγραφή Συναίνεσης</h3>
      <label className="q-field">
        Ημερομηνία
        <input className="input" type="date" defaultValue={TODAY} required />
      </label>
      <label className="q-field">
        Πώς δόθηκε *
        <input
          className="input"
          required
          placeholder={`π.χ. email ${subject}, 28/8`}
        />
      </label>
      <label className="q-field">
        Συνημμένο (προαιρετικό)
        <input className="input" type="file" />
      </label>
      <button className="button" type="button" data-primary="true">
        Καταγραφή Συναίνεσης
      </button>
    </form>
  );
}

function RevokeConfirm({ role, code, itemId, isWork }: Partial<ConsentProps>) {
  return (
    <section className="card q-auto" aria-label="Ανάκληση Συναίνεσης">
      <h3>Ανάκληση Συναίνεσης</h3>
      <p>
        Η καταχώριση κατεβαίνει αμέσως από την Ιστοσελίδα και ο διακόπτης
        «Φαίνεται στην Ιστοσελίδα» κλειδώνει μέχρι να καταγραφεί νέα Συναίνεση.
      </p>
      {isWork && (
        <p className="note">
          Το βίντεο υπάρχει ακόμα στο Vimeo/YouTube· κατέβασέ το κι εκεί αν
          χρειάζεται.
        </p>
      )}
      <label className="q-field">
        Πώς ανακλήθηκε *
        <input className="input" required placeholder="π.χ. τηλεφώνημα, 15/9" />
      </label>
      <div className="btn-row">
        <button className="button" type="button" data-danger="true">
          Ανάκληση τώρα
        </button>
        <Link
          className="button"
          href={screenHref(role as RoleId, code as string, { item: itemId })}
        >
          Άκυρο
        </Link>
      </div>
    </section>
  );
}

export function ConsentBlock(props: ConsentProps) {
  const { role, code, itemId, consent, isWork, confirm } = props;
  return (
    <section className="card" aria-label="Συναίνεση δημοσίευσης">
      <div className="card-title">
        <h2>Συναίνεση δημοσίευσης</h2>
        <Badge tone={consent.isGiven ? "strong" : "attention"}>
          {consent.isGiven ? "Δόθηκε" : "Δεν υπάρχει"}
        </Badge>
      </div>
      <History consent={consent} />
      {confirm === "revoke" && consent.isGiven ? (
        <RevokeConfirm
          role={role}
          code={code}
          itemId={itemId}
          isWork={isWork}
        />
      ) : (
        consent.isGiven && (
          <Link
            className="button"
            data-danger="true"
            href={screenHref(role, code, { item: itemId, confirm: "revoke" })}
          >
            Ανάκληση
          </Link>
        )
      )}
      {!consent.isGiven && <RecordForm subject={props.subject} />}
    </section>
  );
}

interface PreviewProps {
  title: string;
  text?: string;
  cover: string;
  isHidden: boolean;
  children?: ReactNode;
}

export function PublicPreview({
  title,
  text,
  cover,
  isHidden,
  children,
}: PreviewProps) {
  return (
    <section className="card" aria-label="Πώς φαίνεται στην Ιστοσελίδα">
      <h2>Πώς φαίνεται στην Ιστοσελίδα</h2>
      <div className="site-tile q-preview" data-hidden={isHidden}>
        <div className="site-cover">{cover}</div>
        <strong>{title}</strong>
        {text && <p>{text}</p>}
        {children}
      </div>
      {isHidden && (
        <p className="q-hint">
          Αυτή τη στιγμή δεν φαίνεται σε κανέναν Επισκέπτη.
        </p>
      )}
    </section>
  );
}

interface LinkProps {
  code: string;
  params: Readonly<Record<string, string | undefined>>;
  isHidden: boolean;
}

// Οι δημόσιες οθόνες είναι μόνο για Επισκέπτη στο prototype.
export function PublicLink({ code, params, isHidden }: LinkProps) {
  return (
    <p>
      <Link href={screenHref("visitor", code, params)}>
        Δες τη δημόσια σελίδα ({code}) ως Επισκέπτης
      </Link>
      {isHidden && (
        <span className="q-hint">
          {" "}
          · θα δείξει «Η σελίδα δεν βρέθηκε» ώσπου να φανεί
        </span>
      )}
    </p>
  );
}

export const NothingYet = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <StateNotice kind="empty" title={title}>
    {children}
  </StateNotice>
);
