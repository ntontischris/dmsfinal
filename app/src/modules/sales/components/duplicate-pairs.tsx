"use client";

import { useState } from "react";

import { Field, Select } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";

import { mergeClients, resolveDuplicate } from "../actions-queue";
import { DUPLICATE_REASON_LABELS, NO_MANAGER_LABEL } from "../labels";
import type { DuplicatePair, DuplicateSide } from "../types";

import { ActionForm } from "./action-form";

type Survivor = "candidate" | "existing";

const dash = (value: string | null): string => (value ? value : "—");

function SideCard({ title, side }: { title: string; side: DuplicateSide }) {
  const rows: readonly (readonly [string, string])[] = [
    ["Επωνυμία", dash(side.legalName)],
    ["ΑΦΜ", dash(side.afm)],
    ["Τηλέφωνο", dash(side.contactPhone)],
    ["Email", dash(side.contactEmail)],
    ["Κύριο πρόσωπο", dash(side.contactName)],
    ["Υπεύθυνος", side.managerName ?? NO_MANAGER_LABEL],
    ["Ευκαιρίες", String(side.opportunities)],
  ];
  return (
    <section className="min-w-0 rounded-sm border p-3">
      <h3 className="kit-label m-0 mb-2">{title}</h3>
      <p className="m-0 mb-2 font-medium break-words">{side.name}</p>
      <dl className="m-0 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="m-0 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function MergeControls({ pair }: { pair: DuplicatePair }) {
  const [survivor, setSurvivor] = useState<Survivor>("existing");
  const survivorSide = survivor === "existing" ? pair.existing : pair.candidate;
  const absorbedSide = survivor === "existing" ? pair.candidate : pair.existing;
  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <ActionForm
        action={mergeClients}
        submitLabel="Συγχώνευση"
        pendingLabel="Συγχώνευση…"
        variant="danger"
      >
        <input type="hidden" name="survivorId" value={survivorSide.id} />
        <input type="hidden" name="absorbedId" value={absorbedSide.id} />
        <Field label="Πελάτης που μένει">
          <Select
            value={survivor}
            onChange={(event) =>
              setSurvivor(
                event.target.value === "candidate" ? "candidate" : "existing",
              )
            }
          >
            <option value="candidate">{pair.candidate.name} (νέος)</option>
            <option value="existing">{pair.existing.name} (υπάρχων)</option>
          </Select>
        </Field>
      </ActionForm>
      <ActionForm
        action={resolveDuplicate}
        submitLabel="Είναι άλλος"
        pendingLabel="Αποθήκευση…"
        variant="default"
      >
        <input type="hidden" name="flagId" value={pair.flagId} />
      </ActionForm>
    </div>
  );
}

function PairPanel({ pair }: { pair: DuplicatePair }) {
  return (
    <Panel label={`${pair.candidate.name} ~ ${pair.existing.name}`}>
      <div className="grid gap-4">
        <p className="m-0 text-sm">
          Γιατί: {DUPLICATE_REASON_LABELS[pair.reason]}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <SideCard
            title="Νέος, με σήμα «Πιθανό διπλό»"
            side={pair.candidate}
          />
          <SideCard title="Υπάρχων" side={pair.existing} />
        </div>
        <MergeControls pair={pair} />
        <p className="m-0 text-sm text-muted-foreground">
          Η Συγχώνευση ενώνει τους δύο Πελάτες σε έναν, με όλες τις Ευκαιρίες
          και το ιστορικό τους. Το «είναι άλλος» κλείνει το σήμα χωρίς ένωση.
        </p>
      </div>
    </Panel>
  );
}

// B6: κάθε ζευγάρι έχει δύο αποφάσεις, και καμία δεν γίνεται αυτόματα (ADR 0009).
export function DuplicatePairs({ pairs }: { pairs: readonly DuplicatePair[] }) {
  if (pairs.length === 0)
    return (
      <Notice kind="empty" title="Κανένα Πιθανό διπλό">
        <p className="m-0">
          Όταν μια φόρμα μοιάζει με υπάρχοντα Πελάτη χωρίς ακριβές ταίριασμα, θα
          εμφανιστεί εδώ.
        </p>
      </Notice>
    );
  return (
    <div className="grid gap-4">
      {pairs.map((pair) => (
        <PairPanel key={pair.flagId} pair={pair} />
      ))}
    </div>
  );
}
