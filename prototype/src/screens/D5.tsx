import Link from "next/link";

import {
  findAgreement,
  signatoryOf,
  type AgreementRecord,
  type Recipient,
} from "@/data/agreements";
import { memberName } from "@/data/sales";
import { ProposalDocument } from "@/screens/d5-document";
import {
  DEAD_LINK_LABELS,
  type DeadLinkKind,
  type DocLanguage,
} from "@/screens/d5-labels";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtDate,
  parseState,
  screenHref,
  type ScreenProps,
  type ScreenQuery,
} from "@/screens/shared";

type Viewer = "signatory" | "recipient";

const LINK_KINDS: readonly DeadLinkKind[] = [
  "expired",
  "revoked",
  "superseded",
];

const parseLink = (value: string | undefined): DeadLinkKind | null =>
  LINK_KINDS.find((kind) => kind === value) ?? null;

// Ο σύνδεσμος πεθαίνει: από την πορεία της πρότασης ή από την κατάσταση του δικού του Συνδέσμου.
const deadKindOf = (
  agreement: AgreementRecord,
  recipient: Recipient | undefined,
): DeadLinkKind | null => {
  if (agreement.path === "Υπογράφηκε") return "signed";
  if (agreement.path === "Χάθηκε") return "closed";
  if (agreement.path === "Έληξε") return "expired";
  if (agreement.path !== "Εστάλη") return "superseded";
  if (recipient?.link === "ανακλήθηκε") return "revoked";
  if (recipient?.link === "έληξε") return "expired";
  if (recipient?.link === "ακυρώθηκε") return "superseded";
  return null;
};

const recipientFor = (
  agreement: AgreementRecord,
  viewer: Viewer,
): Recipient | undefined =>
  viewer === "signatory"
    ? signatoryOf(agreement)
    : agreement.recipients.find((recipient) => !recipient.isSignatory);

interface SwitchProps {
  query: ScreenQuery;
  name: string;
  options: readonly { value: string | undefined; label: string }[];
  current: string | undefined;
}

function SwitchGroup({ query, name, options, current }: SwitchProps) {
  return (
    <span>
      {options.map((option, index) => (
        <span key={option.label}>
          {index > 0 && "· "}
          <Link
            href={screenHref("visitor", "D5", {
              ...query,
              [name]: option.value,
            })}
            aria-current={option.value === current}
          >
            {option.label}
          </Link>
        </span>
      ))}
    </span>
  );
}

// Μόνο για όποιον ελέγχει το prototype: ποιος ανοίγει τον Σύνδεσμο, σε ποια γλώσσα και αν ζει.
function LinkSwitcher({ query }: { query: ScreenQuery }) {
  return (
    <nav className="d5-switch" aria-label="Παραλλαγές Συνδέσμου">
      <span>Ανοίγει:</span>
      <SwitchGroup
        query={query}
        name="as"
        current={query.as}
        options={[
          { value: undefined, label: "Υπογράφων" },
          { value: "recipient", label: "άλλος παραλήπτης" },
        ]}
      />
      <span>Γλώσσα:</span>
      <SwitchGroup
        query={query}
        name="lang"
        current={query.lang}
        options={[
          { value: undefined, label: "του Πελάτη" },
          { value: "el", label: "el" },
          { value: "en", label: "en" },
        ]}
      />
      <span>Σύνδεσμος:</span>
      <SwitchGroup
        query={query}
        name="link"
        current={query.link}
        options={[
          { value: undefined, label: "ενεργός" },
          { value: "expired", label: "έληξε" },
          { value: "revoked", label: "ανακλήθηκε" },
          { value: "superseded", label: "νεότερη έκδοση" },
        ]}
      />
    </nav>
  );
}

interface DeadLinkProps {
  kind: DeadLinkKind;
  agreement: AgreementRecord;
  lang: DocLanguage;
}

function DeadLink({ kind, agreement, lang }: DeadLinkProps) {
  const labels = DEAD_LINK_LABELS[lang];
  const date =
    kind === "signed"
      ? agreement.signature?.when
      : (agreement.validUntil ?? undefined);
  return (
    <StateNotice
      kind="denied"
      title={labels.title(kind, date ? fmtDate(date) : "")}
    >
      <p>{labels.contact(memberName(agreement.ownerId))}</p>
    </StateNotice>
  );
}

// Σύνδεσμος πρότασης: δημόσια σελίδα χωρίς λογαριασμό. Ένας σύνδεσμος ανά παραλήπτη.
export function D5({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const keep = {
    id: query.id,
    as: query.as,
    lang: query.lang,
    link: query.link,
  };
  const agreement =
    state === "empty"
      ? undefined
      : findAgreement(query.id ?? "ag-kypseli-launch");
  const viewer: Viewer = query.as === "recipient" ? "recipient" : "signatory";
  const lang: DocLanguage =
    query.lang === "el" || query.lang === "en"
      ? query.lang
      : (agreement?.language ?? "el");

  const body = () => {
    if (state === "error") return <ErrorNotice what="η πρόταση" />;
    if (!agreement)
      return <StateNotice kind="empty" title="Δεν βρέθηκε η πρόταση" />;
    const dead =
      parseLink(query.link) ??
      deadKindOf(agreement, recipientFor(agreement, viewer));
    return dead ? (
      <DeadLink kind={dead} agreement={agreement} lang={lang} />
    ) : (
      <ProposalDocument
        key={`${agreement.id}-${viewer}-${lang}`}
        agreement={agreement}
        viewer={viewer}
        language={lang}
      />
    );
  };

  return (
    <>
      <StateSwitcher role={role} code="D5" state={state} keep={keep} />
      <LinkSwitcher query={keep} />
      {body()}
    </>
  );
}
