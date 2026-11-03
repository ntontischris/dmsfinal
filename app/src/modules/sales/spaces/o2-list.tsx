"use client";

import Link from "next/link";
import { useState } from "react";

import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import {
  createListItem,
  deleteListItem,
  moveListItem,
  reactivateListItem,
  renameListItem,
  retireListItem,
  retireStage,
} from "../actions-settings";
import type { ListItem, ListName, ListUsage } from "../types";
import { RowForm, useDoneNotes } from "./b5-forms";
import {
  o2StatusOf,
  O2_STATUS_TONE,
  usesText,
  type O2Status,
} from "./o2-adapter";
import { SpacesActionForm } from "./spaces-form";

// Λίστα Ρύθμισης Πωλήσεων (prototype `screens/o-shared.tsx` ListEditor), με τις πραγματικές ενέργειες της σημερινής
// σελίδας: σειρά ↑↓, μετονομασία, Νέα → διαγραφή, Σε χρήση → απόσυρση (Στάδιο: με μεταφορά), αποσυρμένη → επανενεργοποίηση.
// Αντίγραφο της μορφής του ListEditor των Ρυθμίσεων, γιατί εδώ τα μηνύματα των γραμμών ζουν στον browser.

interface O2ListProps {
  list: ListName;
  title: string;
  items: readonly ListItem[];
  usage: ListUsage;
  showRetired: boolean;
  toggleRetiredHref: string;
}

type Notify = (id: string, text: string) => void;

const Ref = ({ list, id }: { list: ListName; id: string }) => (
  <>
    <input type="hidden" name="list" value={list} />
    <input type="hidden" name="id" value={id} />
  </>
);

// Το μήνυμα επιτυχίας της μετακίνησης ανεβαίνει στη λίστα, όπως στη σημερινή σελίδα· το τελευταίο αντικαθιστά το προηγούμενο.
function MoveButtons({
  list,
  item,
  notify,
}: {
  list: ListName;
  item: ListItem;
  notify: Notify;
}) {
  return (
    <>
      {(["up", "down"] as const).map((direction) => (
        <RowForm
          key={direction}
          action={moveListItem}
          submitLabel={direction === "up" ? "↑" : "↓"}
          ariaLabel={`${direction === "up" ? "Πάνω" : "Κάτω"}: ${item.label}`}
          className="o2-inline"
          onDone={(text) => notify("move", text)}
        >
          <Ref list={list} id={item.id} />
          <input type="hidden" name="direction" value={direction} />
        </RowForm>
      ))}
    </>
  );
}

function Rename({ list, item }: { list: ListName; item: ListItem }) {
  return (
    <SpacesActionForm
      action={renameListItem}
      submitLabel="Αποθήκευση"
      className="btn-row o2-rename"
    >
      <Ref list={list} id={item.id} />
      <input
        className="input"
        name="label"
        required
        defaultValue={item.label}
        aria-label={`Νέα ετικέτα: ${item.label}`}
      />
    </SpacesActionForm>
  );
}

function StageRetire({
  item,
  uses,
  targets,
  onDone,
}: {
  item: ListItem;
  uses: number;
  targets: readonly ListItem[];
  onDone: (text: string) => void;
}) {
  return (
    <span className="stack">
      <span>
        Το «{item.label}» έχει {uses} ανοιχτές Ευκαιρίες. Πρέπει πρώτα να
        μεταφερθούν σε άλλο Στάδιο και μετά αποσύρεται.
      </span>
      <RowForm
        action={retireStage}
        submitLabel="Μεταφορά και απόσυρση"
        className="stack"
        onDone={onDone}
      >
        <input type="hidden" name="stageId" value={item.id} />
        <label htmlFor={`o2-move-${item.id}`}>
          Μεταφορά των ανοιχτών Ευκαιριών σε
        </label>
        <select
          id={`o2-move-${item.id}`}
          name="moveToId"
          className="select"
          defaultValue=""
        >
          <option value="">Χωρίς μεταφορά (καμία ανοιχτή Ευκαιρία)</option>
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.label}
            </option>
          ))}
        </select>
      </RowForm>
    </span>
  );
}

interface RowActionsProps {
  list: ListName;
  item: ListItem;
  status: O2Status;
  onDone: (text: string) => void;
  onAskRetire: () => void;
  isStageUsed: boolean;
}

// Η μία ενέργεια που επιτρέπεται ανά τιμή, όπως στη σημερινή σελίδα.
function RowAction({
  list,
  item,
  status,
  onDone,
  onAskRetire,
  isStageUsed,
}: RowActionsProps) {
  if (status === "Αποσύρθηκε")
    return (
      <RowForm
        action={reactivateListItem}
        submitLabel="Επανενεργοποίηση"
        className="o2-inline"
        onDone={() => undefined}
      >
        <Ref list={list} id={item.id} />
      </RowForm>
    );
  if (item.isSystem)
    return <span className="muted">Το χρειάζεται το σύστημα</span>;
  if (status === "Νέα")
    return (
      <RowForm
        action={deleteListItem}
        submitLabel="Διαγραφή"
        isDanger
        className="o2-inline"
        onDone={onDone}
      >
        <Ref list={list} id={item.id} />
      </RowForm>
    );
  if (isStageUsed)
    return (
      <button type="button" className="button" onClick={onAskRetire}>
        Απόσυρση
      </button>
    );
  return (
    <RowForm
      action={retireListItem}
      submitLabel="Απόσυρση"
      className="o2-inline"
      onDone={onDone}
    >
      <Ref list={list} id={item.id} />
    </RowForm>
  );
}

function ItemRow({
  list,
  item,
  index,
  uses,
  targets,
  notify,
}: {
  list: ListName;
  item: ListItem;
  index: number;
  uses: number;
  targets: readonly ListItem[] | null;
  notify: Notify;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isRetiring, setIsRetiring] = useState(false);
  const status = o2StatusOf(item, uses);
  const onDone = (text: string) => notify(item.id, text);
  return (
    <ListRow
      isFaded={status === "Αποσύρθηκε"}
      lead={
        <span className="o2-order">
          {index + 1}
          {status !== "Αποσύρθηκε" && (
            <MoveButtons list={list} item={item} notify={notify} />
          )}
        </span>
      }
      title={item.label}
      sub={
        isRenaming ? (
          <Rename list={list} item={item} />
        ) : isRetiring && targets ? (
          <StageRetire
            item={item}
            uses={uses}
            targets={targets}
            onDone={onDone}
          />
        ) : undefined
      }
      aside={
        <>
          <span className="part-sub">{usesText(status, uses)}</span>
          <Badge tone={O2_STATUS_TONE[status]}>{status}</Badge>
          <button
            type="button"
            className="button"
            aria-expanded={isRenaming}
            aria-label={`Μετονομασία: ${item.label}`}
            onClick={() => setIsRenaming((current) => !current)}
          >
            Μετονομασία
          </button>
          <RowAction
            list={list}
            item={item}
            status={status}
            onDone={onDone}
            onAskRetire={() => setIsRetiring((current) => !current)}
            isStageUsed={targets !== null && status === "Σε χρήση"}
          />
        </>
      }
    />
  );
}

function AddItem({ list }: { list: ListName }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen)
    return (
      <button type="button" className="button" onClick={() => setIsOpen(true)}>
        + Νέα τιμή
      </button>
    );
  return (
    <SpacesActionForm
      action={createListItem}
      submitLabel="Προσθήκη"
      className="btn-row"
      resetOnSuccess
    >
      <input type="hidden" name="list" value={list} />
      <input
        className="input"
        name="label"
        required
        aria-label="Νέα τιμή"
        placeholder="Νέα τιμή"
      />
    </SpacesActionForm>
  );
}

export function O2List({
  list,
  title,
  items,
  usage,
  showRetired,
  toggleRetiredHref,
}: O2ListProps) {
  const notes = useDoneNotes();
  const active = items.filter((item) => !item.isRetired);
  const visible = showRetired ? items : active;
  const retiredCount = items.length - active.length;
  return (
    <div className="o-card">
      <Panel label={title} aside={<Badge>μόνο ελληνικά</Badge>}>
        {notes.view}
        <RowList>
          {visible.map((item, index) => (
            <ItemRow
              key={item.id}
              list={list}
              item={item}
              index={index}
              uses={usage[item.id] ?? 0}
              targets={
                list === "stages"
                  ? active.filter((other) => other.id !== item.id)
                  : null
              }
              notify={notes.add}
            />
          ))}
        </RowList>
        <div className="btn-row o-list-actions">
          <AddItem list={list} />
          {(retiredCount > 0 || showRetired) && (
            <Link className="button" href={toggleRetiredHref}>
              {showRetired
                ? "Κρύψε αποσυρμένες"
                : `Δείξε αποσυρμένες (${retiredCount})`}
            </Link>
          )}
        </div>
      </Panel>
    </div>
  );
}
