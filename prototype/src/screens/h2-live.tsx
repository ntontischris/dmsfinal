"use client";

import { useState } from "react";

import { H2Actions } from "@/screens/h2-actions";
import { H2Cancel, H2FinalFiles, H2Trail } from "@/screens/h2-after";
import { H2Header } from "@/screens/h2-header";
import { H2Charge, H2Requests } from "@/screens/h2-money";
import type { H2Context, Live, Update } from "@/screens/h2-model";
import { H2Versions } from "@/screens/h2-versions";

interface H2LiveProps {
  ctx: H2Context;
  initial: Live;
  initialVersion?: number;
}

function LastAction({ live }: { live: Live }) {
  const last = live.log.at(-1);
  if (!last?.notify) return null;
  return (
    <p className="h2-memo" role="status">
      {last.what}. Ειδοποιείται: {last.notify}.
    </p>
  );
}

export function H2Live({ ctx, initial, initialVersion }: H2LiveProps) {
  const [live, setLive] = useState<Live>(initial);
  const update: Update = (change) => setLive(change);
  const panel = { ctx, live, update };
  return (
    <div className="h2">
      <H2Header {...panel} />
      <LastAction live={live} />
      <H2Versions {...panel} initial={initialVersion} />
      <H2Actions {...panel} />
      <H2Charge {...panel} />
      <H2Requests {...panel} />
      <H2FinalFiles {...panel} />
      <H2Cancel {...panel} />
      <H2Trail live={live} />
      <p className="h2-memo">
        Οι αλλαγές ζουν μόνο στη μνήμη αυτής της σελίδας· χάνονται με ανανέωση.
      </p>
    </div>
  );
}
