// PROTOTYPE — throwaway, three simpler proposal pages via ?variant=.
// Τα κομμάτια που μοιράζονται οι τρεις παραλλαγές: οι ΣΗΜΕΡΙΝΕΣ ενότητες και φόρμες της D2, η καθεμία μέσα σε ένα
// κλειστό συρτάρι «Αλλαγή …» με μία γραμμή-σύνοψη. Τίποτα δεν χάνεται· απλώς δεν φαίνεται αν δεν το ανοίξεις.

import Link from "next/link";
import type { ReactNode } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Badge } from "@/spaces/screens/shared";

import { setMoneyTerms, updateTerms } from "../actions-draft";
import { statusLabel } from "../helpers";
import { KIND_LABELS } from "../labels";
import type { AgreementCaps, AgreementDetail, KindInfo } from "../types";
import { ActionBar } from "./d2-actions";
import { CostSection, DeviationsSection } from "./d2-cost";
import {
  ChangeRequestsSection,
  RevisionsSection,
  SignatureSection,
} from "./d2-history";
import { LinesSection } from "./d2-lines";
import { isInternal, pendingApprovalDays, type D2Extras } from "./d2-load";
import { usedKindsOf } from "./d2-model";
import { OutboxSection } from "./d2-outbox";
import { PeopleSection } from "./d2-people";
import { PeriodsSection, ScheduleSection } from "./d2-schedule";
import { TermsRows } from "./d2-terms";
import { MoneyRows } from "./d2-terms-money";
import { MilestoneTerms, RevisionLimitTerms } from "./d2-terms-more";
import { D2Form, IdField } from "./d2-ui";
import { SpacesProposalDocument } from "./d5-document";
import {
  limitsLine,
  moneyLine,
  offerName,
  optionLine,
  packagesFor,
  peopleLine,
  periodsLine,
  termsLine,
  warningsOf,
  type Warning,
} from "./d2-proto-model";

export interface ProtoCtx {
  agreement: AgreementDetail;
  kinds: readonly KindInfo[];
  caps: AgreementCaps;
  extras: D2Extras;
  origin: string;
  today: string;
  historyLink: ReactNode;
}

// ───────────── Μικρά κομμάτια ─────────────

export function Drawer({
  title,
  summary,
  canEdit,
  isOpen = false,
  children,
}: {
  title: string;
  summary: ReactNode;
  canEdit: boolean;
  isOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="d2p-drawer" open={isOpen}>
      <summary>
        <span className="d2p-drawer-title">{title}</span>
        <span className="d2p-drawer-sum">{summary}</span>
        <span className="d2p-drawer-cta">
          {canEdit ? "Αλλαγή ›" : "Προβολή ›"}
        </span>
      </summary>
      <div className="d2p-drawer-body">{children}</div>
    </details>
  );
}

export function Warnings({ items }: { items: readonly Warning[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="d2p-warnings" role="list">
      {items.map((w) => (
        <li key={w.key} data-blocking={w.isBlocking}>
          {w.text}
        </li>
      ))}
    </ul>
  );
}

export function ThinkNote({ text }: { text: string }) {
  return (
    <aside className="d2p-think-note" aria-label="Πώς σκέφτεται αυτή η εκδοχή">
      <strong>Πώς σκέφτεται αυτή η εκδοχή</strong>
      <p>{text}</p>
    </aside>
  );
}

// Μία κεφαλίδα: τίτλος, Πελάτης · Ευκαιρία, μία ετικέτα κατάστασης. Η πορεία της πρότασης μένει στο «Ιστορικό».
export function ProtoHeader({ ctx }: { ctx: ProtoCtx }) {
  const { agreement } = ctx;
  return (
    <header className="d2p-header">
      <p className="muted d2p-crumbs">
        <Link href={hrefOf("D1")}>Συμφωνίες</Link> ·{" "}
        <Link href={hrefOf("B2", { id: agreement.client.id })}>
          {agreement.client.name}
        </Link>{" "}
        · Ευκαιρία{" "}
        <Link href={hrefOf("B4", { id: agreement.opportunity.id })}>
          {agreement.opportunity.title}
        </Link>
      </p>
      <div className="d2p-title">
        <h1>{agreement.title || "Χωρίς τίτλο"}</h1>
        <Badge tone="strong">{statusLabel(agreement)}</Badge>
        <Badge>{KIND_LABELS[agreement.kind]}</Badge>
        {ctx.historyLink}
      </div>
    </header>
  );
}

export const warningsFor = (ctx: ProtoCtx): Warning[] =>
  warningsOf(ctx.agreement);

// ───────────── Οι σημερινές ενέργειες και το έγγραφο ─────────────

export function Actions({
  ctx,
  withPreview = false,
}: {
  ctx: ProtoCtx;
  withPreview?: boolean;
}) {
  const { agreement, extras } = ctx;
  return (
    <ActionBar
      agreement={agreement}
      lossReasons={extras.lossReasons}
      usedKinds={usedKindsOf(agreement, ctx.kinds)}
      today={ctx.today}
      pendingDays={pendingApprovalDays(agreement)}
      preview={withPreview ? <Preview ctx={ctx} /> : null}
    />
  );
}

export function Preview({ ctx }: { ctx: ProtoCtx }) {
  const doc = ctx.extras.preview;
  if (doc === null)
    return (
      <p className="muted">Η προεπισκόπηση φαίνεται σε όποιον «Βλέπει ποσά».</p>
    );
  return (
    <div className="d2p-paper">
      <SpacesProposalDocument document={doc} language={doc.language} />
    </div>
  );
}

// ───────────── Οι σημερινές φόρμες, χωρισμένες ─────────────

export function TermsForm({ agreement }: { agreement: AgreementDetail }) {
  const { can, terms, baseline } = agreement;
  const isMonthly = agreement.kind === "monthly";
  const rows = { terms, baseline, isMonthly, isEditing: can.edit };
  return (
    <>
      {can.edit ? (
        <D2Form action={updateTerms} submitLabel="Αποθήκευση όρων">
          <IdField id={agreement.id} />
          <input type="hidden" name="kind" value={agreement.kind} />
          <TermsRows {...rows} />
        </D2Form>
      ) : (
        <TermsRows {...rows} />
      )}
      {!isMonthly && <MilestoneTerms agreement={agreement} />}
      {can.edit && (
        <p className="muted">
          Ό,τι είναι πιο χαλαρό από την προεπιλογή γράφεται ως Παρέκκλιση και
          θέλει Έγκριση.
        </p>
      )}
    </>
  );
}

export function MoneyForm({ agreement }: { agreement: AgreementDetail }) {
  const money = agreement.moneyTerms;
  if (money === null) return null;
  return agreement.can.edit && agreement.can.editPrices ? (
    <D2Form action={setMoneyTerms} submitLabel="Αποθήκευση έκπτωσης">
      <IdField id={agreement.id} />
      <MoneyRows money={money} baseline={agreement.baseline} isEditing />
    </D2Form>
  ) : (
    <MoneyRows money={money} baseline={agreement.baseline} isEditing={false} />
  );
}

export const LinesBlock = ({ ctx }: { ctx: ProtoCtx }) => (
  <LinesSection
    agreement={ctx.agreement}
    kinds={ctx.kinds}
    options={ctx.extras.options}
    isOptionsFailed={ctx.extras.isOptionsFailed}
  />
);

export type DrawerKey =
  | "lines"
  | "terms"
  | "money"
  | "limits"
  | "periods"
  | "cost"
  | "deviations"
  | "basics"
  | "people"
  | "outbox"
  | "history";

const costSummary = (a: AgreementDetail): string =>
  a.cost?.isLowMargin ? "⚠ χαμηλό περιθώριο" : "περιθώριο εντάξει";

const deviationsSummary = (a: AgreementDetail): string => {
  const open = a.deviations.filter((d) => d.status !== "covered").length;
  if (a.deviations.length === 0) return "καμία · στέλνεται κατευθείαν";
  return open === 0
    ? "καλύπτονται από την Έγκριση"
    : `⚠ ${open} θέλουν έγκριση`;
};

// Κάθε συρτάρι: τίτλος, γραμμή-σύνοψη, και μέσα η σημερινή ενότητα. null όταν η ενότητα δεν υπάρχει για αυτή τη Συμφωνία.
export function drawerOf(ctx: ProtoCtx, key: DrawerKey): ReactNode {
  const { agreement: a, caps, extras } = ctx;
  const canEdit = a.can.edit;
  const internal = isInternal(caps);
  const d = (
    title: string,
    summary: ReactNode,
    body: ReactNode,
    isOpen = false,
  ) => (
    <Drawer
      key={key}
      title={title}
      summary={summary}
      canEdit={canEdit}
      isOpen={isOpen}
    >
      {body}
    </Drawer>
  );
  switch (key) {
    case "lines":
      return d(
        "Γραμμές",
        `${offerName(a)} · ποσότητες, τιμές, Παροχές, ώρες, ελεύθερη γραμμή`,
        <LinesBlock ctx={ctx} />,
      );
    case "terms":
      return d("Όροι", termsLine(a), <TermsForm agreement={a} />);
    case "money": {
      const line = moneyLine(a);
      return line === null
        ? null
        : d("Έκπτωση και ρήτρα", line, <MoneyForm agreement={a} />);
    }
    case "limits": {
      const line = limitsLine(a);
      return line === null
        ? null
        : d("Όριο αλλαγών", line, <RevisionLimitTerms agreement={a} />);
    }
    case "periods": {
      const line = periodsLine(a);
      return line === null
        ? null
        : d(
            "Περίοδοι",
            line,
            <PeriodsSection
              agreement={a}
              canSeeProductions={caps.canSeeProductions}
            />,
          );
    }
    case "cost":
      return a.cost === null
        ? null
        : d(
            "Κόστος και περιθώριο",
            costSummary(a),
            <CostSection agreement={a} />,
            a.cost.isLowMargin,
          );
    case "deviations":
      return a.deviations.length === 0 && !canEdit
        ? null
        : d(
            "Παρεκκλίσεις",
            deviationsSummary(a),
            <DeviationsSection agreement={a} />,
          );
    case "basics":
      return d(
        "Τίτλος, γλώσσα, Ισχύς",
        `${a.language === "el" ? "Ελληνικά" : "English"} · ισχύει ως ${a.validUntil.split("-").reverse().join("/")}`,
        <ScheduleSection agreement={a} />,
      );
    case "people":
      return internal
        ? d(
            "Παραλήπτες και Σύνδεσμοι",
            peopleLine(a.recipients),
            <PeopleSection agreement={a} />,
          )
        : null;
    case "outbox":
      return internal
        ? d(
            "Εξερχόμενα",
            extras.outbox.length === 0
              ? "τίποτα ακόμα"
              : `${extras.outbox.length} μηνύματα`,
            <OutboxSection
              items={extras.outbox}
              origin={ctx.origin}
              emailSenderConnected={a.emailSenderConnected}
            />,
          )
        : null;
    case "history":
      return d(
        "Ιστορικό",
        `αναθεώρηση ${a.revision}${a.changeRequests.length > 0 ? ` · ${a.changeRequests.length} αιτήματα αλλαγής` : ""}`,
        <>
          {internal && <ChangeRequestsSection agreement={a} />}
          {internal && <RevisionsSection agreement={a} />}
          <SignatureSection agreement={a} kinds={ctx.kinds} />
        </>,
      );
  }
}

export function Drawers({
  ctx,
  keys,
}: {
  ctx: ProtoCtx;
  keys: readonly DrawerKey[];
}) {
  return (
    <div className="d2p-drawers">{keys.map((key) => drawerOf(ctx, key))}</div>
  );
}

// Οι κάρτες Πακέτων του Καταλόγου, ποιο είναι ήδη μέσα, και ποιες γραμμές-Πακέτα φεύγουν αν διαλέξεις άλλο.
export const packageCardsOf = (ctx: ProtoCtx) => {
  const { agreement: a } = ctx;
  return {
    packages: packagesFor(ctx.extras.options, a.kind).map((o) => ({
      itemId: o.itemId,
      name: o.name,
      line: optionLine(o, ctx.kinds, a.kind),
    })),
    chosenIds: a.lines.flatMap((l) => (l.itemId === null ? [] : [l.itemId])),
    packageLineIds: a.lines
      .filter((l) => l.kind === "package")
      .map((l) => l.id),
  };
};
