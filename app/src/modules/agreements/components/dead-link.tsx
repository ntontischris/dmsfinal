import { formatDate } from "../helpers";
import {
  DEAD_LINK_CONTACT,
  DEAD_LINK_LABELS,
  fillTemplate,
  type DeadLinkKind,
} from "../labels-public";
import type { Language, PublicCompany, PublicResult } from "../types";

// Ο Σύνδεσμος που δεν δουλεύει πια: έληξε, ανακλήθηκε, υπάρχει νεότερος, υπογράφηκε, έκλεισε, δεν υπάρχει.
// Το κείμενο είναι στη γλώσσα της πρότασης· ο άγνωστος Σύνδεσμος δεν έχει γλώσσα και δείχνει και τις δύο.

export interface DeadLinkProps {
  kind: DeadLinkKind;
  language: Language | null;
  managerName: string | null;
  company: PublicCompany | null;
  date?: string | null; // «έληξε στις …» / «υπογράφηκε στις …»
}

// Το αποτέλεσμα μιας ενέργειας που σημαίνει «ο Σύνδεσμος δεν είναι πια ανοιχτός», αλλιώς null.
export const deadKindOf = (result: PublicResult): DeadLinkKind | null => {
  switch (result.status) {
    case "expired":
    case "revoked":
    case "superseded":
    case "signed":
    case "closed":
    case "unknown":
      return result.status;
    default:
      return null;
  }
};

const SIGNED_ON: Readonly<Record<Language, string>> = {
  el: "στις",
  en: "on",
};

const titleOf = (props: DeadLinkProps, language: Language): string => {
  const label = DEAD_LINK_LABELS[language][props.kind];
  const date = props.date ? formatDate(props.date) : "";
  if (props.kind === "expired") return fillTemplate(label, { date });
  if (props.kind === "signed" && date)
    return `${label} ${SIGNED_ON[language]} ${date}`;
  return label;
};

function Message({
  props,
  language,
}: {
  props: DeadLinkProps;
  language: Language;
}) {
  const { company, managerName } = props;
  const who = managerName ?? company?.name ?? "";
  const phone = company?.phone ?? "";
  const email = company?.email ?? "";
  const reach = [phone, email].filter((part) => part !== "").join(" · ");
  return (
    <div lang={language} className="grid gap-1">
      <h1 className="m-0 text-xl font-semibold tracking-tight">
        {titleOf(props, language)}
      </h1>
      {who !== "" && (
        <p className="m-0 text-sm text-muted-foreground">
          {fillTemplate(DEAD_LINK_CONTACT[language], { who })}
        </p>
      )}
      {reach !== "" && (
        <p className="m-0 text-sm text-muted-foreground">{reach}</p>
      )}
    </div>
  );
}

export function DeadLink(props: DeadLinkProps) {
  const languages: readonly Language[] = props.language
    ? [props.language]
    : ["el", "en"];
  return (
    <section
      role="status"
      className="grid gap-6 rounded-md border bg-card p-4 sm:p-6"
    >
      {props.company && <p className="kit-label m-0">{props.company.name}</p>}
      {languages.map((language) => (
        <Message key={language} props={props} language={language} />
      ))}
    </section>
  );
}
