import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { describeDeviation, formatDate, formatMoney } from "../helpers";
import { KIND_LABELS } from "../labels";
import type { ApprovalItem, Deviation } from "../types";

import { NoticeScope } from "./agreement-actions-parts";
import { DecisionForm } from "./decision-form";
import { MutedNote, plural } from "./terms-section-parts";

interface ApprovalQueueProps {
  items: readonly ApprovalItem[];
  canSeeAmounts: boolean;
}

const EMPTY_NOTE =
  "Ο Ιδιοκτήτης και η Διαχείριση έχουν το Δικαίωμα «Παρεκκλίνει από τον Κατάλογο», άρα οι δικές τους προτάσεις δεν περνούν από εδώ. Σε εταιρεία ενός ανθρώπου η λίστα μένει άδεια.";

const DEVIATION_BADGE: Readonly<Record<Deviation["status"], string>> = {
  new: "νέα",
  deeper: "βαθύτερη",
  covered: "ήδη εγκρίθηκε",
};

function DeviationList({
  deviations,
  canSeeAmounts,
}: {
  deviations: readonly Deviation[];
  canSeeAmounts: boolean;
}) {
  return (
    <ul className="m-0 grid list-none gap-2 p-0">
      {deviations.map((deviation) => (
        <li
          key={deviation.key}
          className="flex flex-wrap items-center justify-between gap-2 text-sm"
        >
          <span>{describeDeviation(deviation, canSeeAmounts)}</span>
          <Badge
            tone={deviation.status === "covered" ? undefined : "attention"}
          >
            {DEVIATION_BADGE[deviation.status]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

function LinesTable({ item }: { item: ApprovalItem }) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Γραμμή</Th>
          <Th isNumeric>Κατάλογος</Th>
          <Th isNumeric>Τιμή</Th>
        </tr>
      </thead>
      <tbody>
        {item.lines.map((line, index) => (
          <Tr key={`${line.description}-${index}`}>
            <Td data-label="Γραμμή">
              <span className="grid gap-1 max-sm:justify-items-end">
                {line.quantity > 1
                  ? `${line.quantity} × ${line.description}`
                  : line.description}
                {(line.isFree || line.isBelow) && (
                  <span className="flex flex-wrap gap-1">
                    {line.isFree && <Badge>Ελεύθερη</Badge>}
                    {line.isBelow && (
                      <Badge tone="attention">κάτω από τον Κατάλογο</Badge>
                    )}
                  </span>
                )}
              </span>
            </Td>
            <Td data-label="Κατάλογος" isNumeric>
              {line.catalogPrice === null
                ? "—"
                : formatMoney(line.catalogPrice)}
            </Td>
            <Td data-label="Τιμή" isNumeric>
              {line.unitPrice === null ? "—" : formatMoney(line.unitPrice)}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

// Τι ήταν εγκεκριμένο στην προηγούμενη αναθεώρηση και τι βαθαίνει ή προστίθεται τώρα.
function PreviousApproval({
  item,
  canSeeAmounts,
}: {
  item: ApprovalItem;
  canSeeAmounts: boolean;
}) {
  const { previous } = item;
  if (previous === null) return null;
  const changed = item.deviations
    .filter((d) => d.status !== "covered")
    .map(
      (d) =>
        `${d.status === "deeper" ? "βαθαίνει" : "προσθέτει"}: ${describeDeviation(d, canSeeAmounts)}`,
    );
  return (
    <MutedNote>
      Η αναθεώρηση {previous.revision} εγκρίθηκε
      {previous.decidedByName && ` από ${previous.decidedByName}`}
      {previous.decidedAt && ` στις ${formatDate(previous.decidedAt)}`}
      {previous.comment !== "" && `: «${previous.comment}»`}.
      {changed.length > 0 && ` Η νέα ${changed.join(" · ")}.`}
    </MutedNote>
  );
}

function ApprovalCard({
  item,
  canSeeAmounts,
}: {
  item: ApprovalItem;
  canSeeAmounts: boolean;
}) {
  return (
    <Panel
      label={`${item.clientName} · ${item.title}`}
      aside={
        <Link href={`/app/agreements/${item.agreementId}`} className="text-sm">
          Άνοιγμα Συμφωνίας
        </Link>
      }
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{KIND_LABELS[item.kind]}</Badge>
          <Badge>αναθεώρηση {item.revision}</Badge>
          <Badge>Υπεύθυνος: {item.managerName ?? "—"}</Badge>
          <Badge tone="strong">
            Αναμένει {plural(item.pendingDays, "μέρα", "μέρες")}
          </Badge>
          {item.isReminderDue && (
            <Badge tone="attention">ξαναειδοποιήθηκαν όσοι εγκρίνουν</Badge>
          )}
          {item.isLowMargin === true && (
            <Badge tone="attention">χαμηλό περιθώριο</Badge>
          )}
        </div>
        <DeviationList
          deviations={item.deviations}
          canSeeAmounts={canSeeAmounts}
        />
        {item.lines.length > 0 && <LinesTable item={item} />}
        {item.total !== null && (
          <p className="m-0 text-sm font-medium">
            Σύνολο {formatMoney(item.total)}
            {item.kind === "monthly" ? " / μήνα" : " εφάπαξ"}
          </p>
        )}
        <PreviousApproval item={item} canSeeAmounts={canSeeAmounts} />
        <DecisionForm agreementId={item.agreementId} />
      </div>
    </Panel>
  );
}

// Η D4: οι προτάσεις που περιμένουν Έγκριση, με όσα χρειάζονται για να αποφασίσεις χωρίς να ανοίξεις τη Συμφωνία.
// Το μήνυμα μιας απόφασης μένει στη θέση του και όταν η πρόταση φεύγει από τη λίστα.
export function ApprovalQueue({ items, canSeeAmounts }: ApprovalQueueProps) {
  return (
    <NoticeScope className="gap-4">
      {items.length === 0 ? (
        <Notice kind="empty" title="Καμία πρόταση δεν περιμένει Έγκριση">
          <p className="m-0">{EMPTY_NOTE}</p>
        </Notice>
      ) : (
        items.map((item) => (
          <ApprovalCard
            key={item.agreementId}
            item={item}
            canSeeAmounts={canSeeAmounts}
          />
        ))
      )}
    </NoticeScope>
  );
}
