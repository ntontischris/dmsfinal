import type { RoleId } from "@/data/roles";
import { SALES_CLIENTS } from "@/data/sales";
import { LOGOS, type ClientLogo } from "@/data/website";
import { logoBlockers, logoStatus } from "@/data/website-access";
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
  QFrame,
  SaveBar,
  ShownCard,
  lastChange,
  reasonOf,
  type QRow,
} from "@/screens/q-shared";
import type { ScreenProps } from "@/screens/shared";

const toRow = (l: ClientLogo): QRow => ({
  id: l.id,
  name: l.clientName,
  sub: l.image,
  status: logoStatus(l),
  blockersEl: logoBlockers(l, "el"),
  blockersEn: logoBlockers(l, "en"),
  isShown: l.isShown,
  order: l.order,
  isConsentMissing: !l.consent.isGiven,
});

function LogoFields({ logo }: { logo?: ClientLogo }) {
  return (
    <section className="card">
      <h2>Λογότυπο</h2>
      <label className="q-field">
        Πελάτης
        <select className="input" defaultValue={logo?.clientId ?? ""}>
          <option value="">Επιλογή Πελάτη</option>
          {SALES_CLIENTS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="q-hint">
          Εσωτερική αναφορά: στην Ιστοσελίδα φαίνεται μόνο το λογότυπο.
        </span>
      </label>
      <Field
        label="Εικόνα"
        value={logo?.image}
        hint="Ίδια εικόνα στις δύο γλώσσες."
      />
      <SaveBar isNew={!logo} />
    </section>
  );
}

function LogoAccess({
  role,
  logo,
  confirm,
}: {
  role: RoleId;
  logo: ClientLogo;
  confirm?: string;
}) {
  const isHidden = logoStatus(logo) === "Δεν φαίνεται";
  return (
    <>
      <ShownCard
        isShown={logo.isShown}
        isConsentMissing={!logo.consent.isGiven}
        reason={
          logo.consent.isGiven
            ? `Τι λείπει: ${reasonOf(logoBlockers(logo, "el"), logoBlockers(logo, "en"))}`
            : "Ανάβει μόνο με Συναίνεση δημοσίευσης: καταγράψτε την παρακάτω."
        }
      />
      <ConsentBlock
        role={role}
        code="Q3"
        itemId={logo.id}
        consent={logo.consent}
        subject="του πελάτη"
        confirm={confirm}
      />
      <PublicPreview
        title={logo.clientName}
        cover={`Λογότυπο: ${logo.image}`}
        isHidden={isHidden}
      />
      <PublicLink code="R1" params={{}} isHidden={isHidden} />
    </>
  );
}

function LogoForm({
  role,
  logo,
  query,
}: {
  role: RoleId;
  logo?: ClientLogo;
  query: ScreenProps["query"];
}) {
  return (
    <>
      <BackLink role={role} code="Q3" />
      <h1>{logo ? logo.clientName : "Νέο λογότυπο"}</h1>
      {logo ? (
        <p className="muted">{lastChange(logo.updated)}</p>
      ) : (
        <p className="note">
          Το νέο λογότυπο ξεκινά κρυφό και θέλει Συναίνεση του πελάτη.
        </p>
      )}
      <LogoFields logo={logo} />
      {logo && <LogoAccess role={role} logo={logo} confirm={query.confirm} />}
      <AuditLine role={role} />
    </>
  );
}

function LogoList({ role, isEmpty }: { role: RoleId; isEmpty: boolean }) {
  return (
    <>
      <h1>Λογότυπα πελατών</h1>
      <p className="muted">
        Φαίνονται στην αρχική μόνο με Συναίνεση δημοσίευσης του πελάτη.
      </p>
      <ListToolbar role={role} code="Q3" newLabel="+ Νέο λογότυπο" />
      {isEmpty ? (
        <NothingYet title="Δεν υπάρχουν λογότυπα ακόμα">
          Πρώτο βήμα: πάτα «+ Νέο λογότυπο», διάλεξε Πελάτη και εικόνα· μετά
          κατάγραψε τη Συναίνεσή του.
        </NothingYet>
      ) : (
        <EntryList
          role={role}
          code="Q3"
          rows={LOGOS.map(toRow)}
          nameLabel="Πελάτης"
        />
      )}
      <AuditLine role={role} />
    </>
  );
}

// Q3 «Λογότυπα πελατών»: εικόνα, Πελάτης, Συναίνεση, σειρά.
export function Q3({ role, query }: ScreenProps) {
  return (
    <QFrame role={role} query={query} code="Q3" what="τα λογότυπα">
      {(state) => {
        if (query.item === "new") return <LogoForm role={role} query={query} />;
        const open = LOGOS.find((l) => l.id === query.item);
        if (open && state !== "empty")
          return <LogoForm role={role} logo={open} query={query} />;
        return <LogoList role={role} isEmpty={state === "empty"} />;
      }}
    </QFrame>
  );
}
