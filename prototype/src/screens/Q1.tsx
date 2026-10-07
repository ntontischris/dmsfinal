import Link from "next/link";

import type { RoleId } from "@/data/roles";
import { CATALOGUE, isPackage, type CatalogueItem } from "@/data/catalogue";
import { SECTORS, type Sector } from "@/data/website";
import { sectorBlockers, sectorStatus } from "@/data/website-access";
import { NothingYet, PublicLink, PublicPreview } from "@/screens/q-consent";
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
import { screenHref, type ScreenProps } from "@/screens/shared";

const toRow = (s: Sector): QRow => ({
  id: s.id,
  name: s.nameEl,
  sub: s.nameEn ? `EN: ${s.nameEn}` : "Χωρίς αγγλικό όνομα",
  status: sectorStatus(s),
  blockersEl: sectorBlockers(s, "el"),
  blockersEn: sectorBlockers(s, "en"),
  isShown: s.isShown,
  order: s.order,
  isConsentMissing: false,
});

interface LinkRowProps {
  role: RoleId;
  item: CatalogueItem;
  isLinked: boolean;
}

function CatalogueLink({ role, item, isLinked }: LinkRowProps) {
  const pkg = isPackage(item) ? item : undefined;
  return (
    <li>
      <div className="q-check">
        <input
          type="checkbox"
          defaultChecked={isLinked}
          aria-label={item.name}
        />
        <strong>{item.name}</strong>
        {pkg ? (
          <>
            <span className="badge">
              {pkg.isPublic ? "δημόσιο" : "όχι δημόσιο"}
            </span>
            <span className="badge">
              {pkg.showsPrice ? "δείχνει τιμή" : "χωρίς τιμή"}
            </span>
          </>
        ) : (
          <span className="badge">Υπηρεσία</span>
        )}
      </div>
      <div className="q-hint">
        {pkg &&
          "Το αν είναι δημόσιο και αν δείχνει τιμή αλλάζει στον Κατάλογο. "}
        <Link href={screenHref(role, "C2", { item: item.id })}>
          Άνοιγμα στον Κατάλογο
        </Link>
      </div>
    </li>
  );
}

function CatalogueLinks({ role, sector }: { role: RoleId; sector?: Sector }) {
  const linked = [...(sector?.packageIds ?? []), ...(sector?.serviceIds ?? [])];
  const items = CATALOGUE.filter((i) => !i.isArchived);
  return (
    <section className="card">
      <h2>Πακέτα και Υπηρεσίες του Τομέα</h2>
      <p className="q-hint">
        Η σύνδεση αλλάζει εδώ· η σελίδα του Τομέα δείχνει μόνο τα δημόσια
        Πακέτα.
      </p>
      <ul className="q-checks">
        {items.map((item) => (
          <CatalogueLink
            key={item.id}
            role={role}
            item={item}
            isLinked={linked.includes(item.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function SectorTexts({ sector }: { sector?: Sector }) {
  return (
    <section className="card">
      <h2>Κείμενα</h2>
      <Pair
        el={<Field label="Όνομα (ελληνικά)" value={sector?.nameEl} required />}
        en={
          <Field
            label="Name (English)"
            value={sector?.nameEn}
            hint="Χωρίς αγγλικό όνομα δεν φαίνεται στο /en."
          />
        }
      />
      <Pair
        el={
          <Field
            label="Εισαγωγή (ελληνικά)"
            value={sector?.introEl}
            area
            required
          />
        }
        en={<Field label="Intro (English)" value={sector?.introEn} area />}
      />
      <SaveBar isNew={!sector} />
    </section>
  );
}

function SectorDetail({ role, sector }: { role: RoleId; sector: Sector }) {
  const isHidden = sectorStatus(sector) === "Δεν φαίνεται";
  return (
    <>
      <ShownCard
        isShown={sector.isShown}
        isConsentMissing={false}
        reason={`Τι λείπει: ${reasonOf(sectorBlockers(sector, "el"), sectorBlockers(sector, "en"))}`}
      />
      <CatalogueLinks role={role} sector={sector} />
      <PublicPreview
        title={sector.nameEl}
        text={sector.introEl}
        cover={`Τομέας: ${sector.slug}`}
        isHidden={isHidden}
      />
      <PublicLink
        code="R2"
        params={{ sector: sector.slug }}
        isHidden={isHidden}
      />
    </>
  );
}

function SectorForm({ role, sector }: { role: RoleId; sector?: Sector }) {
  return (
    <>
      <BackLink role={role} code="Q1" />
      <h1>{sector ? sector.nameEl : "Νέος Τομέας"}</h1>
      {sector && <p className="muted">{lastChange(sector.updated)}</p>}
      <SectorTexts sector={sector} />
      {sector ? (
        <SectorDetail role={role} sector={sector} />
      ) : (
        <>
          <p className="note">
            Ο νέος Τομέας ξεκινά κρυφός· τον ανάβεις όταν είναι έτοιμος.
          </p>
          <CatalogueLinks role={role} />
        </>
      )}
      <AuditLine role={role} />
    </>
  );
}

function SectorList({ role, isEmpty }: { role: RoleId; isEmpty: boolean }) {
  return (
    <>
      <h1>Τομείς</h1>
      <p className="muted">
        Οι Τομείς είναι οι ενότητες υπηρεσιών της Ιστοσελίδας. Νέος Τομέας
        ξεκινά κρυφός.
      </p>
      <ListToolbar role={role} code="Q1" newLabel="+ Νέος Τομέας" />
      {isEmpty ? (
        <NothingYet title="Δεν υπάρχουν Τομείς ακόμα">
          Πρώτο βήμα: πάτα «+ Νέος Τομέας», γράψε όνομα και εισαγωγή και σύνδεσε
          τα Πακέτα του.
        </NothingYet>
      ) : (
        <EntryList
          role={role}
          code="Q1"
          rows={SECTORS.map(toRow)}
          nameLabel="Τομέας"
        />
      )}
      <AuditLine role={role} />
    </>
  );
}

// Q1 «Τομείς»: περιεχόμενο Ιστοσελίδας, συνδεδεμένο με Πακέτα και Υπηρεσίες του Καταλόγου.
export function Q1({ role, query }: ScreenProps) {
  return (
    <QFrame role={role} query={query} code="Q1" what="τους Τομείς">
      {(state) => {
        if (query.item === "new") return <SectorForm role={role} />;
        const open = SECTORS.find((s) => s.id === query.item);
        if (open && state !== "empty")
          return <SectorForm role={role} sector={open} />;
        return <SectorList role={role} isEmpty={state === "empty"} />;
      }}
    </QFrame>
  );
}
