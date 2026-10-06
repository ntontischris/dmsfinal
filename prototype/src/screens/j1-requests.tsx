import Link from "next/link";

import {
  daysOpen,
  findClientOf,
  isStale,
  productionTitle,
  teamName,
  type RequestView,
  type RequestMessage,
} from "@/data/messages-access";
import type { RoleId } from "@/data/roles";
import { VIEW_KEYS, staleLabel, truncate } from "@/screens/j1-model";
import { fmtWhen } from "@/screens/j-message";
import { Badge, screenHref } from "@/screens/shared";

import "./j1.css";

export const VIEW_EMPTY: Readonly<Record<RequestView, string>> = {
  "για μένα": "Κανένα ανοιχτό Αίτημα για σένα.",
  "όλα τα ανοιχτά": "Κανένα ανοιχτό Αίτημα.",
  "χωρίς υπεύθυνο": "Κανένα Αίτημα χωρίς υπεύθυνο.",
  κλεισμένα: "Κανένα κλεισμένο Αίτημα ακόμα.",
};

export const UNASSIGNED_NOTE =
  "Εδώ πέφτουν τα Αιτήματα χωρίς ετικέτα Παραγωγής και χωρίς Υπεύθυνο Πελάτη. Τα μοιράζουν όσοι «Μεταβιβάζουν Υπεύθυνο». Αν είσαι μόνος σου στην ομάδα, δεν το βλέπεις: όλα έρχονται σε σένα.";

interface ViewLinksProps {
  role: RoleId;
  views: readonly RequestView[];
  view: RequestView;
  state: string | undefined;
}

export function ViewLinks({ role, views, view, state }: ViewLinksProps) {
  return (
    <p className="j1-views">
      {views.map((v) => (
        <Link
          key={v}
          className="button"
          data-primary={v === view}
          href={screenHref(role, "J1", {
            tab: "requests",
            view: VIEW_KEYS[v],
            state,
          })}
        >
          {v}
        </Link>
      ))}
    </p>
  );
}

function Closing({ role, m }: { role: RoleId; m: RequestMessage }) {
  const closing = m.request.closing;
  if (!closing) return null;
  const isDone = m.request.state === "ολοκληρώθηκε";
  return (
    <div className="j1-closing">
      <span className="muted">
        {isDone ? "ολοκληρώθηκε" : "απορρίφθηκε"} · {teamName(closing.by)} ·{" "}
        {fmtWhen(closing.when)}
      </span>
      {closing.isAutomatic && <p>έκλεισε μόνο του όταν δημιουργήθηκε</p>}
      {isDone && closing.link && (
        <p>
          <Link href={screenHref(role, closing.link.code, closing.link.params)}>
            {closing.link.label}
          </Link>
        </p>
      )}
      {isDone && closing.comment && <p>{closing.comment}</p>}
      {!isDone && closing.reply && <p>Απάντηση: {closing.reply}</p>}
    </div>
  );
}

function RequestItem({ role, m }: { role: RoleId; m: RequestMessage }) {
  const tag = productionTitle(m.productionId);
  return (
    <li className="j1-req">
      <div className="j1-req-head">
        <strong>{m.request.kind}</strong>
        <Badge tone={m.request.state === "ανοιχτό" ? "strong" : undefined}>
          {m.request.state}
        </Badge>
        {isStale(m.request) && <Badge tone="attention">{staleLabel}</Badge>}
      </div>
      <div className="muted">
        {findClientOf(m.clientId)?.name ?? "—"}
        {tag && ` · ${tag}`}
      </div>
      <p>{truncate(m.text)}</p>
      <div className="j1-req-head muted">
        <span>Υπεύθυνος: {teamName(m.request.assigneeId)}</span>
        {m.request.state === "ανοιχτό" && (
          <span>ανοιχτό {daysOpen(m.request)} μέρες</span>
        )}
      </div>
      <Closing role={role} m={m} />
      <Link
        className="button"
        href={screenHref(role, "J2", { client: m.clientId, message: m.id })}
      >
        Άνοιγμα
      </Link>
    </li>
  );
}

export function RequestList({
  role,
  items,
}: {
  role: RoleId;
  items: readonly RequestMessage[];
}) {
  return (
    <div className="scroll">
      <ul className="list">
        {items.map((m) => (
          <RequestItem key={m.id} role={role} m={m} />
        ))}
      </ul>
    </div>
  );
}
