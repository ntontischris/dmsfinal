import Link from "next/link";

import { catalogueCapsOf } from "@/data/catalogue-access";
import {
  SOCIAL_PACKAGE_ID,
  findItem,
  isPackage,
  kindLabel,
  type CatalogueItem,
} from "@/data/catalogue";
import {
  BasicsSection,
  CostSection,
  LearningSection,
  PriceSection,
  ProvisionsSection,
  PublicSection,
  UsageSection,
} from "@/screens/c2-sections";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

// Κενή κατάσταση = νέο στοιχείο: η ίδια σελίδα, με άδεια πεδία. Δεν υπάρχει χωριστός «συντάκτης» Καταλόγου.
const blankItem = (kind: "package" | "service"): CatalogueItem =>
  kind === "package"
    ? {
        kind: "package",
        id: "new",
        name: "",
        description: "",
        billing: "μηνιαίο",
        provisions: [],
        price: 0,
        hours: { shoot: 0, edit: 0 },
        directCost: 0,
        actuals: null,
        activeAgreements: 0,
        isArchived: false,
        isPublic: false,
        showsPrice: false,
        nameEn: "",
        descriptionPublic: "",
        descriptionPublicEn: "",
        sectors: [],
        updated: { when: "", by: "" },
      }
    : {
        kind: "service",
        id: "new",
        name: "",
        description: "",
        unit: "",
        provisions: [],
        price: 0,
        hours: { shoot: 0, edit: 0 },
        directCost: 0,
        actuals: null,
        activeAgreements: 0,
        isArchived: false,
        updated: { when: "", by: "" },
      };

export function C2({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = catalogueCapsOf(role);
  const newKind = query.new === "service" ? "service" : "package";
  const isNew =
    state === "empty" || query.new === "package" || query.new === "service";
  const keep = { id: query.id, new: query.new };

  if (state === "error") {
    return (
      <>
        <StateSwitcher role={role} code="C2" state={state} keep={keep} />
        <ErrorNotice what="η Σελίδα Πακέτου ή Υπηρεσίας" />
      </>
    );
  }

  if (isNew && !caps.canManage) {
    return (
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>
          Νέο Πακέτο ή Υπηρεσία γράφει μόνο όποιος «Διαχειρίζεται Κατάλογο».
        </p>
      </StateNotice>
    );
  }

  const item = isNew
    ? blankItem(newKind)
    : findItem(query.id ?? SOCIAL_PACKAGE_ID);
  if (!item) {
    return <StateNotice kind="empty" title="Δεν βρέθηκε στον Κατάλογο" />;
  }

  if (item.isArchived && !caps.canSeeArchived) {
    return (
      <StateNotice kind="denied" title="Αρχειοθετημένο">
        <p>Το «{item.name}» δεν προσφέρεται σε νέες προτάσεις.</p>
        <p>
          <Link href={screenHref(role, "C1", {})}>Πίσω στον Κατάλογο</Link>
        </p>
      </StateNotice>
    );
  }

  const title = isNew
    ? newKind === "package"
      ? "Νέο Πακέτο"
      : "Νέα Υπηρεσία"
    : item.name;
  const sectionProps = { role, item, caps, isNew };

  return (
    <>
      <StateSwitcher role={role} code="C2" state={state} keep={keep} />
      <div className="card-title">
        <h2>{title}</h2>
        <span className="btn-row">
          {!isNew && <Badge tone="strong">{kindLabel(item)}</Badge>}
          {isPackage(item) && item.isPublic && <Badge>Δημόσιο</Badge>}
          {item.isArchived && <Badge>Αρχειοθετημένο</Badge>}
          {caps.isReadOnly && <Badge>Μόνο ανάγνωση</Badge>}
        </span>
      </div>
      {caps.isReadOnly && (
        <p className="note">
          Βλέπεις τιμές και Παροχές για να διαλέγεις γραμμές στον{" "}
          <Link href={screenHref(role, "D2", {})}>πρόταση</Link>. Οι
          ώρες και το κόστος είναι εσωτερικά.
        </p>
      )}
      <div className="grid2">
        <BasicsSection {...sectionProps} />
        <PriceSection {...sectionProps} />
      </div>
      <ProvisionsSection {...sectionProps} />
      {caps.canSeeCost && (
        <div className="grid2">
          <CostSection {...sectionProps} />
          <LearningSection {...sectionProps} />
        </div>
      )}
      {isPackage(item) && <PublicSection {...sectionProps} item={item} />}
      <UsageSection {...sectionProps} />
      {caps.canManage && (
        <div className="row">
          <span className="muted">
            Κάθε αλλαγή γράφεται στο Ίχνος ενεργειών και ισχύει για νέες
            προτάσεις.
          </span>
          <span className="btn-row">
            <Link className="button" href={screenHref(role, "C1", {})}>
              Άκυρο
            </Link>
            <button type="button" className="button" data-primary="true">
              Αποθήκευση
            </button>
          </span>
        </div>
      )}
    </>
  );
}
