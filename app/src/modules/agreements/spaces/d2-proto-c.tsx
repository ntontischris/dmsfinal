// PROTOTYPE — throwaway, three simpler proposal pages via ?variant=.
// Γ «Σαν το έγγραφο»: γράφεις την πρόταση όπως θα τη διαβάσει ο πελάτης, με «αλλαγή» σε κάθε κομμάτι.
// Λεπτή πλαϊνή στήλη: μόνο τι θέλει προσοχή ή έγκριση, και η Αποστολή.

import type { ReactNode } from "react";

import { formatMoney, formatNumber } from "../helpers";
import { PeopleSection } from "./d2-people";
import { PeriodsSection, ScheduleSection } from "./d2-schedule";
import { RevisionLimitTerms } from "./d2-terms-more";
import {
  Actions,
  Drawers,
  LinesBlock,
  MoneyForm,
  ProtoHeader,
  TermsForm,
  ThinkNote,
  Warnings,
  packageCardsOf,
  warningsFor,
  type ProtoCtx,
} from "./d2-proto-blocks";
import { InlineEdit, PackagePicker, QuickSchedule } from "./d2-proto-forms";
import {
  VARIANTS,
  limitsLine,
  moneyLine,
  periodsLine,
  provisionsLine,
  scheduleSentence,
  signatoryOf,
  termsProse,
} from "./d2-proto-model";

const DocSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="d2p-doc-section">
    <h3>{title}</h3>
    {children}
  </section>
);

function WhatIsIncluded({ ctx }: { ctx: ProtoCtx }) {
  const { agreement: a, kinds } = ctx;
  const editor = (
    <>
      <PackagePicker
        {...packageCardsOf(ctx)}
        agreementId={a.id}
        canEdit={a.can.edit}
      />
      <LinesBlock ctx={ctx} />
    </>
  );
  return (
    <DocSection title="Τι περιλαμβάνει">
      <InlineEdit canEdit={a.can.edit} editor={editor}>
        {a.lines.length === 0 ? (
          <p className="d2p-doc-empty">[ διάλεξε Πακέτο ]</p>
        ) : (
          <ul className="d2p-doc-lines">
            {a.lines.map((l) => (
              <li key={l.id}>
                <strong>
                  {l.quantity > 1 && `${l.quantity}× `}
                  {l.description}
                </strong>
                <span>
                  {provisionsLine(
                    l.provisions.map((p) => ({
                      kindId: p.kindId,
                      quantity: p.quantity * l.quantity,
                    })),
                    kinds,
                  )}
                </span>
                {l.lineTotal !== null && (
                  <span className="d2p-doc-amount">
                    {formatMoney(l.lineTotal)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </InlineEdit>
    </DocSection>
  );
}

function Price({ ctx }: { ctx: ProtoCtx }) {
  const { agreement: a } = ctx;
  if (a.totals === null || a.lines.length === 0) return null;
  const per = a.kind === "monthly" ? " τον μήνα" : "";
  const money = moneyLine(a);
  return (
    <DocSection title="Τιμή">
      <p className="d2p-doc-big">
        {formatMoney(a.totals.price)}
        {per} + ΦΠΑ {formatNumber(a.totals.vatRate)}%{" "}
        <span className="muted">({formatMoney(a.totals.gross)} με ΦΠΑ)</span>
      </p>
      {money !== null && (
        <InlineEdit
          canEdit={a.can.edit && a.can.editPrices}
          editor={<MoneyForm agreement={a} />}
        >
          <p>
            {money[0]?.toUpperCase()}
            {money.slice(1)}.
          </p>
        </InlineEdit>
      )}
    </DocSection>
  );
}

function Duration({ ctx }: { ctx: ProtoCtx }) {
  const { agreement: a } = ctx;
  const periods = periodsLine(a);
  return (
    <DocSection title="Διάρκεια">
      <InlineEdit canEdit={a.can.edit} editor={<QuickSchedule agreement={a} />}>
        <p>{scheduleSentence(a)}</p>
      </InlineEdit>
      {periods !== null && (
        <InlineEdit
          canEdit
          label="δες τις Περιόδους"
          editor={
            <PeriodsSection
              agreement={a}
              canSeeProductions={ctx.caps.canSeeProductions}
            />
          }
        >
          <p className="muted">{periods}.</p>
        </InlineEdit>
      )}
    </DocSection>
  );
}

function Terms({ ctx }: { ctx: ProtoCtx }) {
  const { agreement: a } = ctx;
  const limits = limitsLine(a);
  return (
    <DocSection title="Όροι">
      <InlineEdit canEdit={a.can.edit} editor={<TermsForm agreement={a} />}>
        <div>
          {termsProse(a).map((t) => (
            <p key={t}>{t}</p>
          ))}
        </div>
      </InlineEdit>
      {limits !== null && (
        <InlineEdit
          canEdit={a.can.edit}
          editor={<RevisionLimitTerms agreement={a} />}
        >
          <p>Όριο αλλαγών: {limits}.</p>
        </InlineEdit>
      )}
    </DocSection>
  );
}

function Signature({ ctx }: { ctx: ProtoCtx }) {
  const { agreement: a } = ctx;
  const signatory = signatoryOf(a.recipients);
  const others = a.recipients.filter((r) => !r.isSignatory);
  return (
    <DocSection title="Υπογραφή">
      <InlineEdit
        canEdit
        editor={<PeopleSection agreement={a} />}
        label={a.can.edit ? "αλλαγή" : "Σύνδεσμοι"}
      >
        <p>
          {signatory === null
            ? "[ ποιος υπογράφει; ]"
            : `${signatory.name} · ${signatory.email}`}
          {others.length > 0 && (
            <span className="muted">
              {" "}
              — το βλέπουν και: {others.map((r) => r.name).join(", ")}
            </span>
          )}
        </p>
      </InlineEdit>
    </DocSection>
  );
}

function Rail({ ctx }: { ctx: ProtoCtx }) {
  const warnings = warningsFor(ctx);
  return (
    <aside className="d2p-rail" aria-label="Τι θέλει προσοχή">
      {ctx.agreement.state === "proposal" &&
        (warnings.length === 0 ? (
          <p className="d2p-ok">Όλα εντάξει: στέλνεται.</p>
        ) : (
          <Warnings items={warnings} />
        ))}
      <Actions ctx={ctx} withPreview />
      <Drawers ctx={ctx} keys={["cost", "deviations", "outbox", "history"]} />
    </aside>
  );
}

export function VariantC({ ctx }: { ctx: ProtoCtx }) {
  const { agreement: a } = ctx;
  return (
    <div className="d2p">
      <ProtoHeader ctx={ctx} />
      <ThinkNote text={VARIANTS.c.thinks} />
      <div className="d2p-doc-layout">
        <article className="d2p-doc" aria-label="Η πρόταση">
          <InlineEdit
            canEdit={a.can.edit}
            editor={<ScheduleSection agreement={a} />}
            label="τίτλος, γλώσσα, Ισχύς"
          >
            <header className="d2p-doc-head">
              <span className="kit-label">
                Πρόταση συνεργασίας · προς {a.client.name}
              </span>
              <h2>{a.title || "Χωρίς τίτλο"}</h2>
            </header>
          </InlineEdit>
          <WhatIsIncluded ctx={ctx} />
          <Price ctx={ctx} />
          <Duration ctx={ctx} />
          <Terms ctx={ctx} />
          <Signature ctx={ctx} />
        </article>
        <Rail ctx={ctx} />
      </div>
    </div>
  );
}
