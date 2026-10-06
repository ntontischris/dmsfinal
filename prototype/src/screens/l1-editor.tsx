import Link from "next/link";

import { ASSISTANT_LIMITS, KB_SECTIONS, type KbItem } from "@/data/knowledge";
import { publishBlockers } from "@/data/knowledge-access";
import type { RoleId } from "@/data/roles";
import { Badge, screenHref } from "@/screens/shared";

const AUDIENCE_OPTIONS = [
  { id: "owner", label: "Ιδιοκτήτης" },
  { id: "admin", label: "Διαχείριση" },
  { id: "production", label: "Παραγωγή" },
  { id: "sales", label: "Πωλήσεις" },
  { id: "accountant", label: "Λογιστής" },
  { id: "client", label: "Πλήρης (πελάτη)" },
] as const;

const isChecked = (item: KbItem, id: string): boolean =>
  item.audience?.kind === "ρόλοι" && item.audience.roles.some((r) => r === id);

function AudienceFields({ item }: { item: KbItem }) {
  return (
    <fieldset className="l1-checks">
      <legend>Κοινό</legend>
      {AUDIENCE_OPTIONS.map((o) => (
        <label key={o.id}>
          <input type="checkbox" defaultChecked={isChecked(item, o.id)} />{" "}
          {o.label}
        </label>
      ))}
      <label>
        <input
          type="checkbox"
          defaultChecked={item.audience?.kind === "δημόσιο"}
        />{" "}
        δημόσιο (και Επισκέπτες, μέσω του Βοηθού)
      </label>
    </fieldset>
  );
}

function ContentFields({ item }: { item: KbItem }) {
  if (item.kind === "Άρθρο") {
    return (
      <label>
        Κείμενο
        <textarea
          className="input"
          rows={6}
          defaultValue={item.body.join("\n\n")}
        />
      </label>
    );
  }
  return (
    <div className="note">
      Αρχείο: {item.fileName} ({item.sizeMb} MB). Μέγιστο{" "}
      {ASSISTANT_LIMITS.fixed.fileMb} MB.{" "}
      {item.readability === "μόνο Περίληψη"
        ? "Είναι εικόνα· ο Βοηθός διαβάζει μόνο την Περίληψη."
        : "Ο Βοηθός διαβάζει όλο το κείμενο."}
    </div>
  );
}

function PublishedActions() {
  return (
    <>
      <div className="btn-row">
        <button className="button" type="button" data-primary="true">
          Αποθήκευση (ισχύει αμέσως)
        </button>
        <button className="button" type="button">
          Απόσυρση
        </button>
      </div>
      <p className="note">Γυρίζει σε πρόχειρο· ο Βοηθός το ξεχνά αμέσως.</p>
    </>
  );
}

function DraftActions({ item }: { item: KbItem }) {
  const blockers = publishBlockers(item);
  return (
    <>
      <div className="btn-row">
        <button
          className="button"
          type="button"
          data-primary="true"
          disabled={blockers.length > 0}
        >
          Δημοσίευση
        </button>
        <button className="button" type="button" data-danger="true">
          Διαγραφή
        </button>
      </div>
      {blockers.length > 0 && (
        <ul className="l1-blockers">
          {blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
      <p className="note">
        Δημοσιευμένο στοιχείο πρώτα αποσύρεται. Η διαγραφή είναι οριστική· οι
        Συζητήσεις που το είχαν πηγή το δείχνουν ως «δεν υπάρχει πια».
      </p>
    </>
  );
}

export function ItemEditor({ role, item }: { role: RoleId; item: KbItem }) {
  const isDraft = item.state === "πρόχειρο";
  return (
    <>
      <p>
        <Link href={screenHref(role, "L1", {})}>← Διαχείριση Γνώσης</Link>
      </p>
      <section className="card">
        <div className="card-title">
          <h2>{item.title}</h2>
          <Badge tone={isDraft ? "attention" : "strong"}>{item.state}</Badge>
        </div>
        <p className="note">
          Η Γνώση γράφεται μία φορά στα ελληνικά και δεν γράφει τιμές· όπου
          χρειάζεται τιμή, «δείτε τον Κατάλογο».
        </p>
        <form className="l1-form">
          <label>
            Ενότητα
            <select className="input" defaultValue={item.sectionId}>
              {KB_SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Τίτλος
            <input className="input" defaultValue={item.title} />
          </label>
          <label>
            Περίληψη (1–2 γραμμές, απαραίτητη για δημοσίευση)
            <textarea className="input" rows={2} defaultValue={item.summary} />
          </label>
          <AudienceFields item={item} />
          <ContentFields item={item} />
        </form>
        {isDraft ? <DraftActions item={item} /> : <PublishedActions />}
      </section>
    </>
  );
}
