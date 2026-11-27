// PROTOTYPE — throwaway. B: οι γραμμές «Μπροστά σου» και οι ενέργειες της αριστερής κάρτας (P2 + C1/C2/C3/C5).
import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { fmtDate } from "@/spaces/screens/shared";

import { Line, Lines } from "../b2-box";
import type { ClientPageCtx } from "../b2-context";
import { MoreMenu } from "../b2-header";
import { ClientNewOpportunity } from "../b2-new-opportunity";
import { DoneButton } from "../b2-reminders";
import {
  AttentionLine,
  MoneyLine,
  NextLine,
  clientHref,
  type ProtoClientProps,
} from "./client-parts";
import { NoteOrReminder } from "./note-or-reminder";

const RENEW_DAYS = 30;
const MS_PER_DAY = 86_400_000;

export const isSoloSales = (ctx: ClientPageCtx): boolean =>
  !ctx.data.assignable?.ok || ctx.data.assignable.data.length < 2;

const isOwingOf = (ctx: ClientPageCtx): boolean =>
  (ctx.data.overdueInvoices ?? []).length > 0 ||
  (ctx.data.ledger?.balance ?? 0) > 0;

const endingAgreementOf = (ctx: ClientPageCtx) => {
  const active = (ctx.data.agreements ?? []).find(
    (a) => a.state === "active" && a.endOn !== null,
  );
  if (!active?.endOn) return null;
  const days = Math.round(
    (Date.parse(active.endOn) - Date.parse(ctx.today)) / MS_PER_DAY,
  );
  return days <= RENEW_DAYS ? { active, days, endOn: active.endOn } : null;
};

const showAttentionOf = (ctx: ClientPageCtx): boolean => {
  const attention = ctx.d.attention;
  if (!attention) return false;
  // C2: ξεχασμένη Ευκαιρία → τη λέει ήδη το Επόμενο βήμα· ληξιπρόθεσμα → τα λέει ήδη η MoneyLine.
  if (ctx.d.next?.isLate === true && attention.tab === "opportunities")
    return false;
  if (attention.tab === "ledger" && isOwingOf(ctx)) return false;
  return true;
};

// C3: το Επόμενο βήμα μόνο όταν υπάρχει (βήμα ή γύρισμα).
function Next({ ctx }: { ctx: ClientPageCtx }) {
  if (ctx.d.next === null && !ctx.d.filming) return null;
  return <NextLine ctx={ctx} hideOwner={isSoloSales(ctx)} />;
}

function Owes(props: ProtoClientProps) {
  return isOwingOf(props.ctx) ? (
    <MoneyLine
      ctx={props.ctx}
      href={clientHref(props.ctx, props.variant, { tab: "ledger" })}
    />
  ) : null;
}

// C5: η ενεργή Συμφωνία που λήγει μέσα σε 30 μέρες (ή έχει ήδη λήξει), με σύνδεσμο στη D2.
function AgreementEnding({ ctx }: { ctx: ClientPageCtx }) {
  const ending = endingAgreementOf(ctx);
  if (!ending) return null;
  const { active, days, endOn } = ending;
  return (
    <Line
      mark="↻"
      tag={days < 0 ? "Έληξε" : "Λήγει"}
      isUrgent={days < 0}
      title={`Συμφωνία «${active.title}»`}
      href={hrefOf("D2", { id: active.id })}
      sub={`λήγει ${fmtDate(endOn)} · ${days < 0 ? "έληξε" : `σε ${days} μέρες`}`}
    />
  );
}

// C1: οι ανοιχτές Υπενθυμίσεις μου ως γραμμές, με «Έγινε» επί τόπου.
function Reminders({ ctx }: { ctx: ClientPageCtx }) {
  return (ctx.data.reminders ?? []).map((reminder) => (
    <Line
      key={reminder.id}
      mark="⏰"
      tag="Υπενθύμιση"
      isUrgent={reminder.remindOn <= ctx.today}
      title={reminder.note}
      sub={fmtDate(reminder.remindOn)}
      quick={<DoneButton reminderId={reminder.id} />}
    />
  ));
}

export function AheadLines(props: ProtoClientProps) {
  const { ctx } = props;
  const hasAny =
    showAttentionOf(ctx) ||
    ctx.d.next !== null ||
    !!ctx.d.filming ||
    isOwingOf(ctx) ||
    endingAgreementOf(ctx) !== null ||
    (ctx.data.reminders?.length ?? 0) > 0;
  if (!hasAny) return null;
  return (
    <Lines label="Μπροστά σου">
      {showAttentionOf(ctx) && <AttentionLine {...props} />}
      <Next ctx={ctx} />
      <Owes {...props} />
      <AgreementEnding ctx={ctx} />
      <Reminders ctx={ctx} />
    </Lines>
  );
}

// P2: Νέα Ευκαιρία · Σημείωση/Υπενθύμιση · Νέο τιμολόγιο · ⋯ (χωρίς «Άνοιγμα Ευκαιρίας», C2).
export function CardActions({ ctx }: { ctx: ClientPageCtx }) {
  const canLog = ctx.canEdit && ctx.data.activities !== null;
  const canRemind = ctx.data.reminders !== null;
  return (
    <div className="pc-actions">
      <div className="ml-quick b2-hero-quick">
        {ctx.canEdit && ctx.card !== null && (
          <ClientNewOpportunity
            clientId={ctx.client.id}
            clientName={ctx.client.name}
          />
        )}
        {(canLog || canRemind) && (
          <NoteOrReminder
            clientId={ctx.client.id}
            canLog={canLog}
            canRemind={canRemind}
            rows={(ctx.data.activities ?? []).slice(0, 3)}
            kinds={ctx.data.lists?.activityKinds ?? []}
            openOpportunities={ctx.d.logOpportunities}
          />
        )}
        {!ctx.isReadOnly && (
          <Link href={hrefOf("I3", { client: ctx.client.id })}>
            Νέο τιμολόγιο
          </Link>
        )}
        <MoreMenu ctx={ctx} />
      </div>
    </div>
  );
}
