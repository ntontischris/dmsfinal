"use client";

import { useState } from "react";

import { Input } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { Table, Td, Th, Tr } from "@/components/ui/table";

import { saveRevisionLimits } from "../actions-settings";
import { activeKinds } from "../helpers";
import { FORWARD_NOTE } from "../labels";
import type { KindInfo } from "../types";

import { ActionForm } from "./action-form";

// O3 · Όριο αλλαγών: πόσοι γύροι αλλαγών ανήκουν σε κάθε είδος Παροχής. Κενό = χωρίς γύρους.
// Η φόρμα στέλνει ένα κρυφό πεδίο JSON [{kindId, rounds|null}]· ό,τι δεν διαβάζεται ως αριθμός φτάνει ως κείμενο
// και ο server το απορρίπτει με μήνυμα, αντί να γίνει σιωπηλά null.

interface RevisionLimitsCardProps {
  kinds: readonly KindInfo[];
}

type Draft = Readonly<Record<string, string>>;

// Ό,τι δεν έχει αγγίξει ο Χρήστης μένει όπως το έχει η βάση (και ένα είδος που εμφανίστηκε μετά δεν μηδενίζεται).
const textOf = (kind: KindInfo, draft: Draft): string =>
  draft[kind.id] ?? kind.revisionLimit?.toString() ?? "";

const roundsOf = (text: string): number | string | null => {
  const value = text.trim();
  if (value === "") return null;
  return /^\d{1,3}$/.test(value) ? Number(value) : value;
};

const toField = (kinds: readonly KindInfo[], draft: Draft): string =>
  JSON.stringify(
    kinds.map((kind) => ({
      kindId: kind.id,
      rounds: roundsOf(textOf(kind, draft)),
    })),
  );

export function RevisionLimitsCard({ kinds }: RevisionLimitsCardProps) {
  const active = activeKinds(kinds);
  const [draft, setDraft] = useState<Draft>({});
  if (active.length === 0)
    return (
      <Panel label="Όριο αλλαγών">
        <p className="m-0 text-sm text-muted-foreground">
          Δεν υπάρχει ενεργό είδος Παροχής.
        </p>
      </Panel>
    );
  return (
    <Panel label="Όριο αλλαγών">
      <div className="grid gap-4">
        <p className="m-0 text-sm text-muted-foreground">
          Πόσοι γύροι αλλαγών ανήκουν σε κάθε Παροχή του πελάτη. Αφήνεις κενό
          όταν το είδος δεν έχει γύρους αλλαγών (χωρίς γύρους). {FORWARD_NOTE}
        </p>
        <ActionForm action={saveRevisionLimits} onlyWhenChanged submitLabel="Αποθήκευση">
          <input type="hidden" name="limits" value={toField(active, draft)} />
          <Table>
            <thead>
              <tr>
                <Th>Είδος Παροχής</Th>
                <Th>Γύροι αλλαγών</Th>
              </tr>
            </thead>
            <tbody>
              {active.map((kind) => (
                <Tr key={kind.id}>
                  <Td data-label="Είδος Παροχής">{kind.label}</Td>
                  <Td data-label="Γύροι αλλαγών">
                    <Input
                      aria-label={`Γύροι αλλαγών · ${kind.label}`}
                      inputMode="numeric"
                      placeholder="χωρίς γύρους"
                      className="max-w-40"
                      value={textOf(kind, draft)}
                      onChange={(event) =>
                        setDraft({ ...draft, [kind.id]: event.target.value })
                      }
                    />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </ActionForm>
      </div>
    </Panel>
  );
}
