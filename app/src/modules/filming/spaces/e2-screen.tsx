import Link from "next/link";

import { getViewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { filmingCaps } from "../caps";
import { NO_ANSWER_LABELS } from "../labels";
import { getFilmingSettings, getQueue } from "../queries";
import type { FilmingQueue, FilmingSettings } from "../types";
import {
  cancelItemOf,
  pendingItemOf,
  pendingOldestFirst,
  rescheduleItemOf,
} from "./e2-adapter";
import { E2AnswerCard, E2GuideDone, E2ReasonCard, E2ReasonGone } from "./e2-guide";
import { loadFocusDetails, type EquipmentTemplatesSource } from "./e2-guide-load";
import { EGKRINO_STEPS, focusOf, lockOf, queueHref, requestsOf } from "./e2-guide-model";
import { E2Queue } from "./e2-queue";

import "./e.css";
import "./e1.css";

function NoAnswerNote({ settings }: { settings: FilmingSettings }) {
  return (
    <p className="note">
      Αν δεν απαντήσει κανείς σε {settings.noAnswerHours} ώρες:{" "}
      {NO_ANSWER_LABELS[settings.noAnswerAction].toLocaleLowerCase("el")}.
      Αλλάζει στις <Link href="/app/settings/filming">Ρυθμίσεις</Link>. Σε
      εταιρεία ενός ανθρώπου ο Ιδιοκτήτης τα βλέπει και τα κάνει όλα εδώ· τίποτα
      δεν μπλοκάρει.
    </p>
  );
}

export interface E2Guide {
  step: number;
  reqId: string | null;
}

// Ο οδηγός «Εγκρίνω αιτήματα γυρίσματος» πάνω από την ουρά: βήμα 1 = η κάρτα ενός αιτήματος, 2γ = ο λόγος.
async function GuideCard({
  guide,
  queue,
  equipmentTemplates,
  nowMs,
}: {
  guide: E2Guide;
  queue: FilmingQueue;
  equipmentTemplates: EquipmentTemplatesSource;
  nowMs: number;
}) {
  const requests = requestsOf(queue);
  if (guide.step === EGKRINO_STEPS.reason) {
    const request = requests.find((item) => item.id === guide.reqId);
    return request ? <E2ReasonCard request={request} /> : <E2ReasonGone nextHref={queueHref()} />;
  }
  if (guide.step !== EGKRINO_STEPS.answer) return null;
  const focus = focusOf(requests, guide.reqId);
  if (!focus) return <E2GuideDone />;
  const details = await loadFocusDetails(focus.request, equipmentTemplates);
  return (
    <E2AnswerCard
      key={focus.request.id}
      focus={focus}
      lock={lockOf(focus.request, nowMs, details.slotProblem)}
      approveLine={details.approveLine}
    />
  );
}

// E2 «Αναμένουν έγκριση» στη νέα εμφάνιση (prototype `screens/E2.tsx`): νέες κρατήσεις, αιτήματα ακύρωσης μετά το Όριο
// και (μόνο στην εφαρμογή) αιτήματα μετάθεσης. Μόνο όποιος «Εγκρίνει Γυρίσματα».
export async function SpacesFilmingQueue({
  guide = null,
  equipmentTemplates,
}: {
  guide?: E2Guide | null;
  equipmentTemplates: EquipmentTemplatesSource;
}) {
  const caps = filmingCaps(await getViewer());
  if (!caps.canApprove)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα.">
          Την ουρά έγκρισης τη βλέπει όποιος «Εγκρίνει Γυρίσματα».
        </StateNotice>
      </div>
    );
  const [queue, settings] = await Promise.all([getQueue(), getFilmingSettings()]);
  if (!queue.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="η ουρά «Αναμένουν έγκριση»" />
      </div>
    );
  const { pending, cancelRequests, rescheduleRequests } = queue.data;
  const nowMs = new Date().getTime();
  const isEmpty =
    pending.length + cancelRequests.length + rescheduleRequests.length === 0;
  // Η ουρά μένει πάντα στη σελίδα: μετά την τελευταία απόφαση δείχνει το αποτέλεσμα και από κάτω το «τίποτα».
  return (
    <div data-spaces>
      {guide && (
        <GuideCard guide={guide} queue={queue.data} equipmentTemplates={equipmentTemplates} nowMs={nowMs} />
      )}
      {settings.ok && !isEmpty && <NoAnswerNote settings={settings.data} />}
      <E2Queue
        pending={pendingOldestFirst(pending).map((entry) => pendingItemOf(entry, nowMs))}
        cancels={cancelRequests.map((entry) => cancelItemOf(entry, nowMs))}
        reschedules={rescheduleRequests.map((entry) => rescheduleItemOf(entry, nowMs))}
        empty={
          <StateNotice kind="empty" title="Τίποτα δεν περιμένει απάντηση.">
            Όταν ένας πελάτης κλείσει Γύρισμα ή ζητήσει ακύρωση μετά το Όριο, θα
            εμφανιστεί εδώ. <Link href={hrefOf("E1")}>Όλα τα Γυρίσματα</Link>
          </StateNotice>
        }
      />
    </div>
  );
}
