import Link from "next/link";

import {
  agreementTotal,
  costOfAgreement,
  statusLabel,
  type AgreementRecord,
} from "@/data/agreements";
import { agreementCapsOf, visibleAgreements } from "@/data/agreements-access";
import { TODAY, findClient, memberName } from "@/data/sales";
import {
  AgreementsTable,
  type AgreementBucket,
  type AgreementRow,
} from "@/screens/d1-agreements-table";
import { ClientAgreementCards } from "@/screens/d1-client-cards";
import {
  Badge,
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtDate,
  fmtMoney,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";
import type { RoleId } from "@/data/roles";

const EXPIRY_WINDOW_DAYS = 30;

const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

const bucketOf = (agreement: AgreementRecord): AgreementBucket => {
  if (agreement.state === "πρόταση")
    return agreement.path === "Χάθηκε" ? "closed" : "proposal";
  return agreement.state === "έληξε" || agreement.state === "λύθηκε"
    ? "closed"
    : "active";
};

const amountOf = (agreement: AgreementRecord): string =>
  `${fmtMoney(agreementTotal(agreement))} ${agreement.kind === "μηνιαία" ? "/ μήνα" : "εφάπαξ"}`;

const discountOf = (agreement: AgreementRecord): string | null => {
  const { percent, months } = agreement.terms.firstMonthsDiscount;
  return percent > 0
    ? `−${percent}% ${months} ${months === 1 ? "μήνα" : "μήνες"}`
    : null;
};

const timeOf = (agreement: AgreementRecord): string => {
  const { start, end, validUntil, dissolution } = agreement;
  if (agreement.state === "πρόταση")
    return validUntil
      ? `${validUntil < TODAY ? "Ίσχυε" : "Ισχύει"} ως ${fmtDate(validUntil)}`
      : "—";
  const span = start
    ? end
      ? `${fmtDate(start)} – ${fmtDate(end)}`
      : `από ${fmtDate(start)}`
    : "—";
  return dissolution ? `${span} · λύθηκε ${fmtDate(dissolution.when)}` : span;
};

const expiresLabelOf = (agreement: AgreementRecord): string | null => {
  if (agreement.state !== "ενεργή" || !agreement.end) return null;
  const days = daysBetween(TODAY, agreement.end);
  if (days < 0 || days > EXPIRY_WINDOW_DAYS) return null;
  return days === 1 ? "λήγει σε 1 μέρα" : `λήγει σε ${days} μέρες`;
};

const ATTENTION_PATHS = new Set(["Αναμένει Έγκριση", "Έληξε"]);

const rowOf = (
  role: RoleId,
  agreement: AgreementRecord,
  canSeeCost: boolean,
): AgreementRow => ({
  id: agreement.id,
  href: screenHref(role, "D2", { id: agreement.id }),
  clientHref: screenHref(role, "B2", { id: agreement.clientId }),
  clientName: findClient(agreement.clientId)?.name ?? "—",
  title: agreement.title,
  kind: agreement.kind,
  bucket: bucketOf(agreement),
  status: statusLabel(agreement),
  isAttention:
    agreement.state === "πρόταση" && ATTENTION_PATHS.has(agreement.path ?? ""),
  isLowMargin: canSeeCost && costOfAgreement(agreement).isLowMargin,
  amount: amountOf(agreement),
  discount: discountOf(agreement),
  time: timeOf(agreement),
  expiresLabel: expiresLabelOf(agreement),
  owner: memberName(agreement.ownerId),
});

// Λίστα Συμφωνιών. Ομάδα: πίνακας με φίλτρα (Πωλήσεις: μόνο ό,τι τους αφορά, Λογιστής: ανάγνωση). Πελάτης: κάρτες με τα δικά του.
export function D1({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = agreementCapsOf(role);

  if (!caps.canSee)
    return (
      <StateNotice kind="denied" title="Δεν έχεις πρόσβαση στις Συμφωνίες" />
    );

  return (
    <>
      <StateSwitcher role={role} code="D1" state={state} />
      {caps.isClient ? (
        <ClientView role={role} state={state} />
      ) : (
        <TeamView role={role} state={state} />
      )}
    </>
  );
}

interface ViewProps {
  role: RoleId;
  state: ReturnType<typeof parseState>;
}

function TeamView({ role, state }: ViewProps) {
  const caps = agreementCapsOf(role);
  const rows = visibleAgreements(role).map((agreement) =>
    rowOf(role, agreement, caps.canSeeCost),
  );

  return (
    <>
      <div className="toolbar">
        <span className="muted grow">
          {caps.isScoped &&
            "Βλέπεις τις Συμφωνίες των Πελατών σου και όσες βγήκαν από δικές σου Ευκαιρίες."}
        </span>
        {caps.isReadOnly && <Badge>Μόνο ανάγνωση</Badge>}
      </div>
      {caps.canCompose && (
        <p className="note">
          Νέα πρόταση ξεκινά πάντα μέσα από μια Ευκαιρία:{" "}
          <Link href={screenHref(role, "B3", {})}>άνοιξε το Pipeline</Link>.
        </p>
      )}
      {state === "error" && <ErrorNotice what="η λίστα Συμφωνιών" />}
      {state === "empty" && (
        <StateNotice
          kind="empty"
          title="Καμία Συμφωνία ακόμα. Η πρώτη ξεκινά από μια Ευκαιρία."
        />
      )}
      {state === "normal" && <AgreementsTable rows={rows} />}
    </>
  );
}

function ClientView({ role, state }: ViewProps) {
  if (state === "error") return <ErrorNotice what="η λίστα Συμφωνιών" />;
  const agreements = visibleAgreements(role);
  if (state === "empty" || agreements.length === 0)
    return (
      <StateNotice
        kind="empty"
        title="Δεν έχετε ακόμα Συμφωνία με την ομάδα."
      />
    );
  return <ClientAgreementCards role={role} agreements={agreements} />;
}
