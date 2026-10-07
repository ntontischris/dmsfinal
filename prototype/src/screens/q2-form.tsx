import type { RoleId } from "@/data/roles";
import { SALES_CLIENTS, findClient } from "@/data/sales";
import { SECTORS, type CaseStory, type Work } from "@/data/website";
import { isCaseStudy, workBlockers, workStatus } from "@/data/website-access";
import { ConsentBlock, PublicLink, PublicPreview } from "@/screens/q-consent";
import {
  AuditLine,
  BackLink,
  Field,
  Pair,
  SaveBar,
  ShownCard,
  lastChange,
  reasonOf,
} from "@/screens/q-shared";

const storyOf = (s?: CaseStory) => ({
  challenge: s?.challenge,
  solution: s?.solution,
  result: s?.result,
});

function StoryFields({
  story,
  lang,
}: {
  story?: CaseStory;
  lang: "el" | "en";
}) {
  const s = storyOf(story);
  const el = lang === "el";
  return (
    <>
      <Field label={el ? "Πρόκληση" : "Challenge"} value={s.challenge} area />
      <Field label={el ? "Λύση" : "Solution"} value={s.solution} area />
      <Field label={el ? "Αποτέλεσμα" : "Result"} value={s.result} area />
    </>
  );
}

function WorkTexts({ work }: { work?: Work }) {
  return (
    <section className="card">
      <h2>Κείμενα</h2>
      <Pair
        el={<Field label="Τίτλος (ελληνικά)" value={work?.titleEl} required />}
        en={<Field label="Title (English)" value={work?.titleEn} />}
      />
      <Pair
        el={
          <Field
            label="Περίληψη (ελληνικά)"
            value={work?.summaryEl}
            area
            required
          />
        }
        en={<Field label="Summary (English)" value={work?.summaryEn} area />}
      />
      <Field
        label="Πλατφόρμα βίντεο (Vimeo ή YouTube)"
        value={work?.video.host}
      />
      <Field label="Σύνδεσμος βίντεο" value={work?.video.url} type="url" />
      <Field
        label="Εξώφυλλο"
        value={work?.cover}
        hint="Ο player φορτώνει μόνο όταν πατηθεί «▶»."
      />
    </section>
  );
}

function SectorsAndClient({ work }: { work?: Work }) {
  const client = findClient(work?.clientId);
  return (
    <section className="card">
      <h2>Τομείς και Πελάτης</h2>
      <ul className="q-checks">
        {SECTORS.map((s) => (
          <li key={s.id}>
            <label className="q-check">
              <input
                type="checkbox"
                defaultChecked={work?.sectorIds.includes(s.id)}
              />
              {s.nameEl}
            </label>
          </li>
        ))}
      </ul>
      <label className="q-field">
        Πελάτης (προαιρετικό)
        <select
          className="input"
          defaultValue={work?.clientId ?? ""}
          disabled={work?.isOwnProduction}
        >
          <option value="">Κανένας</option>
          {SALES_CLIENTS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="q-hint">
          Εσωτερική αναφορά μόνο: δεν δημοσιεύει τίποτα από τον Πελάτη
          {client ? ` (τώρα: ${client.name})` : ""}.
        </span>
      </label>
      <label className="q-check">
        <input type="checkbox" defaultChecked={work?.isOwnProduction} />
        Δική μας παραγωγή (χωρίς πελάτη): δεν χρειάζεται Συναίνεση
      </label>
      <label className="q-check">
        <input type="checkbox" defaultChecked={work?.isFeatured} />
        Επιλεγμένη στην αρχική
      </label>
    </section>
  );
}

function StoryCard({ work }: { work?: Work }) {
  return (
    <section className="card">
      <h2>Case study</h2>
      <p className="q-hint">
        Γίνεται case study σε μια γλώσσα μόνο όταν συμπληρωθούν και τα τρία
        πεδία (Πρόκληση, Λύση, Αποτέλεσμα) σε εκείνη τη γλώσσα. Τώρα: ελληνικά{" "}
        {work && isCaseStudy(work, "el") ? "ναι" : "όχι"}, αγγλικά{" "}
        {work && isCaseStudy(work, "en") ? "ναι" : "όχι"}.
      </p>
      <Pair
        el={<StoryFields story={work?.storyEl} lang="el" />}
        en={<StoryFields story={work?.storyEn} lang="en" />}
      />
    </section>
  );
}

function WorkAccess({
  role,
  work,
  query,
}: {
  role: RoleId;
  work: Work;
  query: Readonly<Record<string, string | undefined>>;
}) {
  const isHidden = workStatus(work) === "Δεν φαίνεται";
  const isMissing = !work.isOwnProduction && !work.consent.isGiven;
  return (
    <>
      <ShownCard
        isShown={work.isShown}
        isConsentMissing={isMissing}
        reason={
          isMissing
            ? "Ανάβει μόνο με Συναίνεση δημοσίευσης: καταγράψτε την παρακάτω."
            : `Τι λείπει: ${reasonOf(workBlockers(work, "el"), workBlockers(work, "en"))}`
        }
      />
      {work.isOwnProduction ? (
        <p className="note">
          Δική μας παραγωγή: δεν υπάρχει Πελάτης, άρα δεν χρειάζεται Συναίνεση.
        </p>
      ) : (
        <ConsentBlock
          role={role}
          code="Q2"
          itemId={work.id}
          consent={work.consent}
          subject="του πελάτη"
          isWork
          confirm={query.confirm}
        />
      )}
      <PublicPreview
        title={work.titleEl}
        text={work.summaryEl}
        cover={work.cover}
        isHidden={isHidden}
      />
      <PublicLink
        code={isCaseStudy(work, "el") ? "R4" : "R3"}
        params={isCaseStudy(work, "el") ? { work: work.slug } : {}}
        isHidden={isHidden}
      />
    </>
  );
}

interface FormProps {
  role: RoleId;
  work?: Work;
  query: Readonly<Record<string, string | undefined>>;
}

export function WorkForm({ role, work, query }: FormProps) {
  return (
    <>
      <BackLink role={role} code="Q2" />
      <h1>{work ? work.titleEl : "Νέα Δουλειά"}</h1>
      {work ? (
        <p className="muted">{lastChange(work.updated)}</p>
      ) : (
        <p className="note">Η νέα Δουλειά ξεκινά κρυφή.</p>
      )}
      <WorkTexts work={work} />
      <SectorsAndClient work={work} />
      <StoryCard work={work} />
      <SaveBar isNew={!work} />
      {work && <WorkAccess role={role} work={work} query={query} />}
      <AuditLine role={role} />
    </>
  );
}
