// PROTOTYPE — throwaway, three simpler proposal pages via ?variant=.
// Α «Τρία βήματα»: Τι πουλάμε → Πότε και σε ποιον → Έλεγχος και αποστολή. Ένα κύριο κουμπί ανά βήμα.

import {
  Actions,
  Drawers,
  Preview,
  packageCardsOf,
  ProtoHeader,
  ThinkNote,
  Warnings,
  warningsFor,
  type ProtoCtx,
} from "./d2-proto-blocks";
import { PackagePicker, QuickSchedule, Stepper } from "./d2-proto-forms";
import {
  VARIANTS,
  firstOpenStep,
  offerLine,
  offerName,
  peopleLine,
  scheduleSentence,
  signatoryOf,
} from "./d2-proto-model";

function WhatStep({ ctx }: { ctx: ProtoCtx }) {
  const { agreement: a } = ctx;
  const cards = packageCardsOf(ctx);
  const warnings = warningsFor(ctx).filter(
    (w) => w.key === "margin" || w.key === "approval",
  );
  return (
    <div className="stack">
      <h2 className="d2p-h">Τι πουλάμε</h2>
      <p className="d2p-lead">
        {a.lines.length === 0 ? (
          "Διάλεξε ένα Πακέτο."
        ) : (
          <>
            <strong>{offerName(a)}</strong> — {offerLine(a, ctx.kinds)}
          </>
        )}
      </p>
      <Warnings items={warnings} />
      <PackagePicker {...cards} agreementId={a.id} canEdit={a.can.edit} />
      <Drawers ctx={ctx} keys={["lines", "cost", "deviations"]} />
    </div>
  );
}

function WhenStep({ ctx }: { ctx: ProtoCtx }) {
  const { agreement: a } = ctx;
  return (
    <div className="stack">
      <h2 className="d2p-h">Πότε και σε ποιον</h2>
      <p className="d2p-lead">
        {scheduleSentence(a)} {peopleLine(a.recipients)}.
      </p>
      {a.can.edit && <QuickSchedule agreement={a} submitLabel="Αποθήκευση" />}
      <Drawers
        ctx={ctx}
        keys={["terms", "money", "limits", "periods", "basics", "people"]}
      />
    </div>
  );
}

function SendStep({ ctx }: { ctx: ProtoCtx }) {
  return (
    <div className="stack">
      <h2 className="d2p-h">Έλεγχος και αποστολή</h2>
      <Warnings items={warningsFor(ctx)} />
      <Actions ctx={ctx} />
      <p className="muted">Έτσι θα τη δει ο πελάτης:</p>
      <Preview ctx={ctx} />
      <Drawers ctx={ctx} keys={["outbox", "history"]} />
    </div>
  );
}

export function VariantA({ ctx }: { ctx: ProtoCtx }) {
  const { agreement: a } = ctx;
  const steps = [
    {
      label: "Τι πουλάμε",
      summary:
        a.lines.length === 0
          ? "δεν διάλεξες ακόμα"
          : offerLine(a, ctx.kinds) || offerName(a),
      isDone: a.lines.length > 0,
      hasOwnPrimary: a.lines.length === 0,
      body: <WhatStep ctx={ctx} />,
    },
    {
      label: "Πότε και σε ποιον",
      summary:
        signatoryOf(a.recipients) === null
          ? "λείπει ο Υπογράφων"
          : peopleLine(a.recipients),
      isDone: signatoryOf(a.recipients) !== null,
      hasOwnPrimary: a.can.edit,
      body: <WhenStep ctx={ctx} />,
    },
    {
      label: "Έλεγχος και αποστολή",
      summary: warningsFor(ctx).some((w) => w.isBlocking)
        ? "θέλει κάτι ακόμα"
        : "έτοιμη",
      isDone: a.path !== "draft",
      body: <SendStep ctx={ctx} />,
    },
  ];
  return (
    <div className="d2p">
      <ProtoHeader ctx={ctx} />
      <ThinkNote text={VARIANTS.a.thinks} />
      <Stepper steps={steps} initial={firstOpenStep(a)} />
    </div>
  );
}
