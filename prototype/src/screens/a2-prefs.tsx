import Link from "next/link";

import type { Preference } from "@/data/notifications-access";
import type { RoleId } from "@/data/roles";
import { Badge, StateNotice, screenHref } from "@/screens/shared";

const groupByEvent = (
  prefs: readonly Preference[],
): readonly (readonly [string, readonly Preference[]])[] =>
  Object.entries(
    prefs.reduce<Record<string, Preference[]>>(
      (acc, p) => ({
        ...acc,
        [p.eventTitle]: [...(acc[p.eventTitle] ?? []), p],
      }),
      {},
    ),
  );

function Explanation({ role }: { role: RoleId }) {
  if (role === "client") {
    return (
      <p className="note">
        Τα απαραίτητα (Τιμολόγιο, Συμφωνία, νέα Έκδοση…) δεν σβήνουν. Κάθε μη
        απαραίτητο email έχει και σύνδεσμο διακοπής μέσα του.
      </p>
    );
  }
  return (
    <p className="note">
      Σβήνεις οποιονδήποτε Αυτοματισμό για τον εαυτό σου· οι συνάδελφοι
      συνεχίζουν να τον λαμβάνουν.
    </p>
  );
}

function PrefRow({ pref }: { pref: Preference }) {
  const { automation, canMute, isMuted } = pref;
  return (
    <li className="a2-pref">
      <div className="row">
        <label>
          <input
            type="checkbox"
            defaultChecked={!isMuted}
            disabled={!canMute}
          />
          Λαμβάνω
        </label>
        <Badge>{automation.channel}</Badge>
      </div>
      {!canMute && <span className="a2-lock">🔒 απαραίτητο: δεν σβήνει</span>}
    </li>
  );
}

export function PrefsTab({
  role,
  prefs,
}: {
  role: RoleId;
  prefs: readonly Preference[];
}) {
  const canConfigure = role === "owner" || role === "admin";
  return (
    <>
      <Explanation role={role} />
      {prefs.length === 0 ? (
        <StateNotice
          kind="empty"
          title="Κανένας Αυτοματισμός δεν φτάνει σε σένα"
        >
          Όταν υπάρξει κάτι που σε αφορά, θα το δεις εδώ.
        </StateNotice>
      ) : (
        groupByEvent(prefs).map(([title, rows]) => (
          <section key={title} className="card">
            <h2 className="card-title">{title}</h2>
            <ul className="list">
              {rows.map((pref) => (
                <PrefRow key={pref.automation.id} pref={pref} />
              ))}
            </ul>
          </section>
        ))
      )}
      <p className="note">Δεν ειδοποιείσαι για ό,τι έκανες εσύ ο ίδιος.</p>
      {canConfigure && (
        <p>
          <Link href={screenHref(role, "K1", {})}>Ρύθμιση Αυτοματισμών</Link>
        </p>
      )}
    </>
  );
}
