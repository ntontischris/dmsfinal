"use client";

import { useState } from "react";

import { ListRow, RowList } from "@/spaces/kit/parts";

import type { KindInfo } from "../types";
import { limitTextOf, limitsField, type LimitsDraft } from "./o3-adapter";

// Τα πεδία «Γύροι αλλαγών» ανά είδος Παροχής: κρατούν το πρόχειρο και γράφουν το κρυφό πεδίο JSON που περιμένει το action.
export function O3LimitsFields({ kinds }: { kinds: readonly KindInfo[] }) {
  const [draft, setDraft] = useState<LimitsDraft>({});
  return (
    <>
      <input type="hidden" name="limits" value={limitsField(kinds, draft)} />
      <RowList>
        {kinds.map((kind) => (
          <ListRow
            key={kind.id}
            title={kind.label}
            sub={kind.labelEn}
            aside={
              <input
                className="input"
                aria-label={`Γύροι αλλαγών · ${kind.label}`}
                inputMode="numeric"
                placeholder="χωρίς γύρους"
                value={limitTextOf(kind, draft)}
                onChange={(event) =>
                  setDraft({ ...draft, [kind.id]: event.target.value })
                }
              />
            }
          />
        ))}
      </RowList>
    </>
  );
}
