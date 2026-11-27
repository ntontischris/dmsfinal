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
  type ProtoClientProps,
} from "./client-parts";
import { NoteOrReminder } from "./note-or-reminder";

const RENEW_DAYS = 30;
const MS_PER_DAY = 86_400_000;

// C2: όταν το Επόμενο βήμα έχει περάσει, η «ξεχασμένη Ευκαιρία» λέγεται μία φορά (στη γραμμή του βήματος).
function Attention(props: ProtoClientProps) {
  const isSaidByNext =
    props.ctx.d.next?.isLate === true &&
    props.ctx.d.attention?.tab === "opportunities";
  return isSaidByNext ? null : <AttentionLine {...props} />;
}

// C3: το Επόμενο βήμα μόνο όταν υπάρχει (βήμα ή γύρισμα).
function Next({ ctx }: { ctx: ClientPageCtx }) {
  if (ctx.d.next === null && !ctx.d.filming) return null;
  return <NextLine ctx={ctx} />;
}

function Owes({ ctx }: { ctx: ClientPageCtx }) {
  const isOwing =
    (ctx.data.overdueInvoices ?? []).length > 0 ||
    (ctx.data.ledger?.balance ?? 0) > 0;
  return isOwing ? <MoneyLine ctx={ctx} /> : null;
}

// C5: η ενεργή Συμφωνία που λήγει μέσα σε 30 μέρες (ή έχει ήδη λήξει), με σύνδεσμο στη D2.
function AgreementEnding({ ctx }: { ctx: ClientPageCtx }) {
  const active = (ctx.data.agreements ?? []).find(
    (a) => a.state === "active" && a.endOn !== null,
  );
  if (!active?.endOn) return null;
  const days = Math.round(
    (Date.parse(active.endOn) - Date.parse(ctx.today)) / MS_PER_DAY,
  );
  if (days > RENEW_DAYS) return null;
  return (
    <Line
      mark="↻"
      tag={days < 0 ? "Έληξε" : "Λήγει"}
      isUrgent={days < 0}
      title={`Συμφωνία «${active.title}»`}
      href={hrefOf("D2", { id: active.id })}
      sub={`λήγει ${fmtDate(active.endOn)} · ${days < 0 ? "έληξε" : `σε ${days} μέρες`}`}
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
  return (
    <Lines label="Μπροστά σου">
      <Attention {...props} />
      <Next ctx={props.ctx} />
      <Owes ctx={props.ctx} />
      <AgreementEnding ctx={props.ctx} />
      <Reminders ctx={props.ctx} />
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
