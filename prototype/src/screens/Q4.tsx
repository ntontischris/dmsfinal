import type { RoleId } from "@/data/roles";
import { TEAM_USERS } from "@/data/team";
import { TEAM_CARDS, type TeamCard } from "@/data/website";
import { teamBlockers, teamStatus } from "@/data/website-access";
import {
  ConsentBlock,
  NothingYet,
  PublicLink,
  PublicPreview,
} from "@/screens/q-consent";
import {
  AuditLine,
  BackLink,
  EntryList,
  Field,
  ListToolbar,
  Pair,
  QFrame,
  SaveBar,
  ShownCard,
  lastChange,
  reasonOf,
  type QRow,
} from "@/screens/q-shared";
import { fmtDate, type ScreenProps } from "@/screens/shared";

const userOf = (t: TeamCard) => TEAM_USERS.find((u) => u.id === t.userId);
const isAutoHidden = (t: TeamCard) =>
  userOf(t)?.status === "απενεργοποιημένος" && !t.isShown;

const toRow = (t: TeamCard): QRow => ({
  id: t.id,
  name: t.name,
  sub: isAutoHidden(t)
    ? "Κρύφτηκε μόνη της: ο Χρήστης απενεργοποιήθηκε"
    : t.titleEl,
  status: teamStatus(t),
  blockersEl: teamBlockers(t, "el"),
  blockersEn: teamBlockers(t, "en"),
  isShown: t.isShown,
  order: t.order,
  isConsentMissing: !t.consent.isGiven,
});

function AutoHiddenNote({ card }: { card: TeamCard }) {
  const user = userOf(card);
  if (!isAutoHidden(card) || !user) return null;
  return (
    <p className="note q-auto" role="status">
      Κρύφτηκε μόνη της όταν απενεργοποιήθηκε ο Χρήστης
      {user.deactivatedAt ? ` (${fmtDate(user.deactivatedAt)})` : ""}. Αν ο
      Χρήστης ενεργοποιηθεί ξανά, η κάρτα μένει κρυφή ώσπου να την ανάψεις εσύ.
    </p>
  );
}

function CardFields({ card }: { card?: TeamCard }) {
  return (
    <section className="card">
      <h2>Κάρτα</h2>
      <label className="q-field">
        Χρήστης ομάδας (προαιρετικό)
        <select className="input" defaultValue={card?.userId ?? ""}>
          <option value="">Χωρίς σύνδεση</option>
          {TEAM_USERS.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.status === "απενεργοποιημένος" ? " (απενεργοποιημένος)" : ""}
            </option>
          ))}
        </select>
        <span className="q-hint">
          Η επιλογή προσυμπληρώνει το όνομα. Δεν δημοσιεύει email ή άλλα
          στοιχεία του Χρήστη.
        </span>
      </label>
      <Pair
        el={<Field label="Όνομα (ελληνικά)" value={card?.name} required />}
        en={<Field label="Name (English)" value={card?.nameEn} />}
      />
      <Pair
        el={<Field label="Τίτλος (ελληνικά)" value={card?.titleEl} required />}
        en={
          <Field
            label="Title (English)"
            value={card?.titleEn}
            hint="Χωρίς αγγλικό τίτλο δεν φαίνεται στο /en."
          />
        }
      />
      <Field label="Φωτογραφία" value={card?.photo} />
      <SaveBar isNew={!card} />
    </section>
  );
}

function CardAccess({
  role,
  card,
  confirm,
}: {
  role: RoleId;
  card: TeamCard;
  confirm?: string;
}) {
  const isHidden = teamStatus(card) === "Δεν φαίνεται";
  return (
    <>
      <AutoHiddenNote card={card} />
      <ShownCard
        isShown={card.isShown}
        isConsentMissing={!card.consent.isGiven}
        reason={
          card.consent.isGiven
            ? `Τι λείπει: ${reasonOf(teamBlockers(card, "el"), teamBlockers(card, "en"))}`
            : "Ανάβει μόνο με τη Συναίνεση του ίδιου του ανθρώπου."
        }
      />
      <ConsentBlock
        role={role}
        code="Q4"
        itemId={card.id}
        consent={card.consent}
        subject="του ίδιου του ανθρώπου"
        confirm={confirm}
      />
      <PublicPreview
        title={card.name}
        text={card.titleEl}
        cover={`Φωτογραφία: ${card.photo}`}
        isHidden={isHidden}
      />
      <PublicLink code="R6" params={{}} isHidden={isHidden} />
    </>
  );
}

function CardForm({
  role,
  card,
  query,
}: {
  role: RoleId;
  card?: TeamCard;
  query: ScreenProps["query"];
}) {
  return (
    <>
      <BackLink role={role} code="Q4" />
      <h1>{card ? card.name : "Νέα κάρτα Ομάδας"}</h1>
      {card ? (
        <p className="muted">{lastChange(card.updated)}</p>
      ) : (
        <p className="note">
          Η νέα κάρτα ξεκινά κρυφή και θέλει τη Συναίνεση του ίδιου του
          ανθρώπου.
        </p>
      )}
      <CardFields card={card} />
      {card && <CardAccess role={role} card={card} confirm={query.confirm} />}
      <AuditLine role={role} />
    </>
  );
}

function CardList({ role, isEmpty }: { role: RoleId; isEmpty: boolean }) {
  return (
    <>
      <h1>Ομάδα στην Ιστοσελίδα</h1>
      <p className="muted">
        Κάθε κάρτα φαίνεται μόνο με τη Συναίνεση του ίδιου του ανθρώπου. Αν
        απενεργοποιηθεί ο συνδεδεμένος Χρήστης, η κάρτα κρύβεται μόνη της.
      </p>
      <ListToolbar role={role} code="Q4" newLabel="+ Νέα κάρτα" />
      {isEmpty ? (
        <NothingYet title="Δεν υπάρχουν κάρτες Ομάδας ακόμα">
          Πρώτο βήμα: πάτα «+ Νέα κάρτα», διάλεξε Χρήστη ομάδας για να
          προσυμπληρωθεί το όνομα και ρώτα τον ίδιο για τη Συναίνεσή του.
        </NothingYet>
      ) : (
        <EntryList
          role={role}
          code="Q4"
          rows={TEAM_CARDS.map(toRow)}
          nameLabel="Άνθρωπος"
        />
      )}
      <AuditLine role={role} />
    </>
  );
}

// Q4 «Ομάδα στην Ιστοσελίδα»: κάρτες με Συναίνεση του ίδιου του ανθρώπου.
export function Q4({ role, query }: ScreenProps) {
  return (
    <QFrame role={role} query={query} code="Q4" what="την Ομάδα">
      {(state) => {
        if (query.item === "new") return <CardForm role={role} query={query} />;
        const open = TEAM_CARDS.find((t) => t.id === query.item);
        if (open && state !== "empty")
          return <CardForm role={role} card={open} query={query} />;
        return <CardList role={role} isEmpty={state === "empty"} />;
      }}
    </QFrame>
  );
}
