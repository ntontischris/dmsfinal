import Link from "next/link";

import type { KbItem } from "@/data/knowledge";
import {
  knowledgeCapsOf,
  readableItems,
  searchItems,
  sectionsWithItems,
} from "@/data/knowledge-access";
import type { RoleId } from "@/data/roles";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtDate,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./a8.css";

export function A8({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const header = (
    <StateSwitcher role={role} code="A8" state={state} keep={{ item: query.item, q: query.q }} />
  );
  if (!knowledgeCapsOf(role).canRead) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Ο Επισκέπτης δεν έχει λογαριασμό· στην Ιστοσελίδα ρωτά τον Βοηθό.
        </StateNotice>
      </>
    );
  }
  if (state === "error") {
    return (
      <>
        {header}
        <ErrorNotice what="τη Γνώση" />
      </>
    );
  }
  const body = query.item ? (
    <ItemView role={role} id={query.item} />
  ) : (
    <Library role={role} q={query.q ?? ""} isEmpty={state === "empty"} />
  );
  return (
    <>
      {header}
      {body}
    </>
  );
}

function AskAssistant({ role }: { role: RoleId }) {
  return (
    <p className="note">
      Δοκίμασε να ρωτήσεις τον <Link href={screenHref(role, "A9", {})}>Βοηθό</Link>.
    </p>
  );
}

function SearchForm({ q, state }: { q: string; state?: string }) {
  return (
    <form className="a8-search" method="get">
      <input className="input" type="search" name="q" defaultValue={q} placeholder="Αναζήτηση στη Γνώση" aria-label="Αναζήτηση" />
      {state && <input type="hidden" name="state" value={state} />}
      <button className="button" type="submit">Αναζήτηση</button>
    </form>
  );
}

function ItemRow({ role, item }: { role: RoleId; item: KbItem }) {
  return (
    <li className="a8-item">
      <div className="row">
        <Link href={screenHref(role, "A8", { item: item.id })}>{item.title}</Link>
        <Badge>{item.kind}</Badge>
      </div>
      <div className="muted">Περίληψη: {item.summary}</div>
      <div className="a8-meta">Ενημερώθηκε {fmtDate(item.updated.when)}</div>
    </li>
  );
}

interface LibraryProps {
  role: RoleId;
  q: string;
  isEmpty: boolean;
}

function Library({ role, q, isEmpty }: LibraryProps) {
  const caps = knowledgeCapsOf(role);
  const items = isEmpty ? [] : searchItems(readableItems(role), q);
  const groups = sectionsWithItems(items);
  return (
    <>
      <div className="toolbar">
        <h1 className="grow">Γνώση</h1>
        {caps.canManage && (
          <Link className="button" href={screenHref(role, "L1", {})}>Διαχείριση Γνώσης →</Link>
        )}
      </div>
      <SearchForm q={q} state={isEmpty ? "empty" : undefined} />
      {role !== "client" && (
        <p className="note">Για τιμές, δες τον Κατάλογο.</p>
      )}
      {groups.length === 0 ? (
        <StateNotice kind="empty" title={q ? `Τίποτα για «${q}»` : "Δεν υπάρχει ακόμα Γνώση για σένα"}>
          <AskAssistant role={role} />
        </StateNotice>
      ) : (
        groups.map(({ section, items: list }) => (
          <section className="card" key={section.id}>
            <div className="card-title"><h2>{section.title}</h2></div>
            <p className="muted">{section.blurb}</p>
            <ul className="list">
              {list.map((item) => <ItemRow key={item.id} role={role} item={item} />)}
            </ul>
          </section>
        ))
      )}
      {role === "client" && (
        <p className="note">
          Δεν βρίσκεις κάτι; Ρώτα τον <Link href={screenHref(role, "A9", {})}>Βοηθό</Link> ή γράψε στη Συνομιλία με την ομάδα.
        </p>
      )}
    </>
  );
}

function ItemContent({ item, canManage }: { item: KbItem; canManage: boolean }) {
  if (item.kind === "Άρθρο") {
    return (
      <div className="a8-body">
        {item.body.map((p, i) => <p key={i}>{p}</p>)}
      </div>
    );
  }
  return (
    <>
      <dl className="dl">
        <dt>Αρχείο</dt><dd>{item.fileName}</dd>
        <dt>Μέγεθος</dt><dd>{item.sizeMb} MB</dd>
      </dl>
      <button className="button" type="button">Λήψη</button>
      {canManage && item.readability === "μόνο Περίληψη" && (
        <p className="note">Ο Βοηθός διαβάζει μόνο την Περίληψη αυτού του Αρχείου (είναι εικόνα).</p>
      )}
    </>
  );
}

function ItemView({ role, id }: { role: RoleId; id: string }) {
  const back = <Link href={screenHref(role, "A8", {})}>← Γνώση</Link>;
  const item = readableItems(role).find((i) => i.id === id);
  if (!item) {
    return (
      <>
        <p>{back}</p>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Αυτό το στοιχείο δεν ανήκει στο Κοινό σου.
        </StateNotice>
      </>
    );
  }
  const sectionTitle = sectionsWithItems([item])[0]?.section.title ?? "";
  return (
    <>
      <p>{back}</p>
      <article className="card a8-item">
        <div className="card-title"><h2>{item.title}</h2><Badge>{item.kind}</Badge></div>
        <div className="a8-meta">Ενότητα: {sectionTitle} · Ενημερώθηκε {fmtDate(item.updated.when)}</div>
        <p className="muted">Περίληψη: {item.summary}</p>
        <ItemContent item={item} canManage={knowledgeCapsOf(role).canManage} />
      </article>
    </>
  );
}
