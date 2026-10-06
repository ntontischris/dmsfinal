import Link from "next/link";

import type { Message } from "@/data/messages";
import {
  conversationsOf,
  findClientOf,
  messageCapsOf,
  messagesOf,
  meOf,
  productionTitle,
  productionsOfClient,
  teamName,
} from "@/data/messages-access";
import { J2Thread } from "@/screens/j2-thread";
import { J2Side } from "@/screens/j2-side";
import { parseFilter, type J2Filter } from "@/screens/j2-model";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./j2.css";

const DENIED_TEXT =
  "Χωρίς δικαίωμα: δεν είσαι Υπεύθυνος του Πελάτη ούτε Μέλος κάποιας Παραγωγής του";

export function J2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const clientId = query.client ?? "kypseli";
  const keep = { client: query.client, production: query.production };
  const caps = messageCapsOf(role);
  const switcher = (
    <StateSwitcher role={role} code="J2" state={state} keep={keep} />
  );
  if (state === "error")
    return (
      <>
        {switcher}
        <ErrorNotice what="τη Συνομιλία" />
      </>
    );
  if (caps.isClient)
    return (
      <>
        {switcher}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>Η ομάδα βλέπει εδώ τη Συνομιλία· εσύ έχεις τη σελίδα Μηνύματα</p>
          <Link className="button" href={screenHref(role, "J3", {})}>
            Άνοιγμα Μηνυμάτων
          </Link>
        </StateNotice>
      </>
    );
  const client = findClientOf(clientId);
  if (!caps.canSee || !client)
    return (
      <>
        {switcher}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>{caps.canSee ? "Ο Πελάτης δεν βρέθηκε." : DENIED_TEXT}</p>
        </StateNotice>
      </>
    );
  const isEmptyState = state === "empty";
  const visibleAll = isEmptyState ? [] : messagesOf(role, clientId);
  const isOwner = client.ownerId === meOf(role);
  if (!isEmptyState && caps.isScoped && !isOwner && visibleAll.length === 0)
    return (
      <>
        {switcher}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          <p>{DENIED_TEXT}</p>
        </StateNotice>
      </>
    );
  const isPartial = caps.isScoped && !isOwner;
  const production = query.production;
  const initial = isEmptyState ? [] : messagesOf(role, clientId, production);
  return (
    <>
      {switcher}
      <Header role={role} clientId={clientId} />
      {isPartial && (
        <p className="note">
          Βλέπεις μόνο τα Μηνύματα με την ετικέτα των Παραγωγών σου και όσα σε
          ανέφεραν. Τιμές και ανανεώσεις συζητιούνται χωρίς ετικέτα και τις
          βλέπει ο Υπεύθυνος Πελάτη.
        </p>
      )}
      <Chips
        role={role}
        clientId={clientId}
        visible={visibleAll}
        filter={parseFilter(query.filter)}
        production={production}
        hideUntagged={isPartial}
      />
      <div className="j2-layout">
        <J2Thread
          key={`${clientId}-${production ?? ""}-${query.filter ?? ""}-${state}`}
          role={role}
          clientId={clientId}
          initial={initial}
          filter={parseFilter(query.filter)}
          production={production}
          highlightId={query.message}
          isEmptyState={isEmptyState}
          canWrite={caps.canWrite}
        />
        <J2Side role={role} clientId={clientId} visible={visibleAll} />
      </div>
      <p className="note">
        Μία Συνομιλία ανά Πελάτη (ADR 0012). Τα Εσωτερικά Μηνύματα δεν φτάνουν
        ποτέ στον πελάτη. Δεν υπάρχουν αποδείξεις ανάγνωσης: κανείς δεν βλέπει
        ποιος διάβασε. Όταν ένα Μέλος αφαιρείται από μια Παραγωγή, χάνει αμέσως
        την πρόσβαση στα Μηνύματα της ετικέτας. Τα email είναι no-reply, με
        «Απάντησε στο DMS».
      </p>
    </>
  );
}

function Header({
  role,
  clientId,
}: {
  role: ScreenProps["role"];
  clientId: string;
}) {
  const client = findClientOf(clientId);
  if (!client) return null;
  const rows = conversationsOf(role);
  return (
    <section className="card">
      <h2 className="card-title">
        Συνομιλία:{" "}
        <Link href={screenHref(role, "B2", { client: client.id })}>
          {client.name}
        </Link>
      </h2>
      <p className="muted">
        Υπεύθυνος Πελάτη: {teamName(client.ownerId)} · Κατάσταση:{" "}
        {client.status}
      </p>
      <div className="j2-switch">
        <Link className="button" href={screenHref(role, "J1", {})}>
          Όλες οι Συνομιλίες
        </Link>
        {rows.length > 1 && <span className="muted">Πελάτης:</span>}
        {rows.length > 1 &&
          rows.map((row) => (
            <Link
              key={row.client.id}
              className="chip"
              aria-current={row.client.id === clientId}
              href={screenHref(role, "J2", { client: row.client.id })}
            >
              {row.client.name}
            </Link>
          ))}
      </div>
    </section>
  );
}

interface ChipsProps {
  role: ScreenProps["role"];
  clientId: string;
  visible: readonly Message[];
  filter: J2Filter;
  production?: string;
  hideUntagged: boolean;
}

function Chips({
  role,
  clientId,
  visible,
  filter,
  production,
  hideUntagged,
}: ChipsProps) {
  const tagged = productionsOfClient(clientId).filter((p) =>
    visible.some((m) => m.productionId === p.id),
  );
  const link = (params: Record<string, string | undefined>) =>
    screenHref(role, "J2", { client: clientId, ...params });
  const isAll = !production && filter === "all";
  return (
    <>
      <ul className="j2-chips" aria-label="Φίλτρα">
        <li>
          <Link href={link({})} aria-current={isAll}>
            Όλα
          </Link>
        </li>
        {tagged.map((p) => (
          <li key={p.id}>
            <Link
              href={link({ production: p.id })}
              aria-current={production === p.id}
            >
              {p.title}
            </Link>
          </li>
        ))}
        {!hideUntagged && (
          <li>
            <Link
              href={link({ filter: "untagged" })}
              aria-current={!production && filter === "untagged"}
            >
              Χωρίς ετικέτα
            </Link>
          </li>
        )}
        <li>
          <Link
            href={link({ filter: "internal" })}
            aria-current={!production && filter === "internal"}
          >
            Εσωτερικά
          </Link>
        </li>
      </ul>
      {production && (
        <p className="muted">
          Φιλτράρισμα: {productionTitle(production) ?? production} ·{" "}
          <Link href={link({})}>Καθαρισμός φίλτρου</Link>
        </p>
      )}
    </>
  );
}
