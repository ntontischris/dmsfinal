// PROTOTYPE — throwaway, three simpler proposal pages via ?variant=.
// Β «Μία ήρεμη σελίδα»: κάρτα-σύνοψη σε απλές προτάσεις με το ένα κουμπί, τρεις σύντομες ενότητες,
// και όλα τα προχωρημένα σε συρτάρια «Αλλαγή …» με μία γραμμή-σύνοψη.

import { Panel } from "@/spaces/kit/panel";

import {
  Actions,
  Drawers,
  Preview,
  ProtoHeader,
  ThinkNote,
  Warnings,
  packageCardsOf,
  warningsFor,
  type ProtoCtx,
} from "./d2-proto-blocks";
import { PackagePicker, QuickSchedule } from "./d2-proto-forms";
import {
  VARIANTS,
  moneyLine,
  offerLine,
  offerName,
  peopleLine,
  scheduleSentence,
  termsLine,
} from "./d2-proto-model";

function SummaryCard({ ctx }: { ctx: ProtoCtx }) {
  const { agreement: a } = ctx;
  const money = moneyLine(a);
  return (
    <section className="card d2p-summary" aria-label="Η πρόταση με λίγα λόγια">
      <div className="d2p-summary-text">
        <p className="d2p-lead">
          {a.lines.length === 0 ? (
            <>
              Η πρόταση προς <strong>{a.client.name}</strong> δεν έχει ακόμα
              τίποτα μέσα.
            </>
          ) : (
            <>
              <strong>{offerName(a)}</strong> για {a.client.name}:{" "}
              {offerLine(a, ctx.kinds)}.
            </>
          )}
        </p>
        <p>{scheduleSentence(a)}</p>
        <p>
          {peopleLine(a.recipients)}. Όροι {termsLine(a)}
          {money === null ? "" : `· ${money}`}.
        </p>
        <Warnings items={warningsFor(ctx)} />
      </div>
      <div className="d2p-summary-action">
        <Actions ctx={ctx} />
      </div>
    </section>
  );
}

export function VariantB({ ctx }: { ctx: ProtoCtx }) {
  const { agreement: a } = ctx;
  return (
    <div className="d2p">
      <ProtoHeader ctx={ctx} />
      <ThinkNote text={VARIANTS.b.thinks} />
      <SummaryCard ctx={ctx} />
      <Panel
        label="1 · Τι πουλάμε"
        aside={a.lines.length > 0 ? offerName(a) : undefined}
      >
        <PackagePicker
          {...packageCardsOf(ctx)}
          agreementId={a.id}
          canEdit={a.can.edit}
        />
        <Drawers ctx={ctx} keys={["lines"]} />
      </Panel>
      <Panel label="2 · Πότε και σε ποιον">
        {a.can.edit ? (
          <QuickSchedule agreement={a} />
        ) : (
          <p>
            {scheduleSentence(a)} {peopleLine(a.recipients)}.
          </p>
        )}
      </Panel>
      <Panel label="3 · Πριν την αποστολή">
        <details className="d2p-drawer">
          <summary>
            <span className="d2p-drawer-title">Όπως θα τη δει ο πελάτης</span>
            <span className="d2p-drawer-sum">το έγγραφο με τον Σύνδεσμο</span>
            <span className="d2p-drawer-cta">Άνοιγμα ›</span>
          </summary>
          <div className="d2p-drawer-body">
            <Preview ctx={ctx} />
          </div>
        </details>
      </Panel>
      <h2 className="d2p-h d2p-more">Αλλαγή όσων είναι τυπικά</h2>
      <Drawers
        ctx={ctx}
        keys={[
          "terms",
          "money",
          "limits",
          "periods",
          "cost",
          "deviations",
          "basics",
          "people",
          "outbox",
          "history",
        ]}
      />
    </div>
  );
}
