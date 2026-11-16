"use client";

import { useEffect, useState } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { ListRow, RowList } from "@/spaces/kit/parts";

import { listFlowClients } from "./flow-clients";
import { stepHref, withQuery, type Flow, type FlowClient } from "./flows";

type Load =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; rows: FlowClient[] };

// Βήμα «Για ποιον Πελάτη;»: η λίστα μέσα στον οδηγό. Ένα πάτημα → επόμενο βήμα με τον Πελάτη (?client=).
export function GuideClients({ flow, step }: { flow: Flow; step: number }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  useEffect(() => {
    let isLive = true;
    listFlowClients()
      .then((result) => {
        if (isLive)
          setLoad(
            result.ok
              ? { state: "ready", rows: result.data }
              : { state: "error" },
          );
      })
      .catch((error: unknown) => {
        console.error("flows.clients", error);
        if (isLive) setLoad({ state: "error" });
      });
    return () => {
      isLive = false;
    };
  }, []);
  if (load.state === "loading")
    return <p className="flow-guide-preset">Φορτώνουν οι Πελάτες…</p>;
  if (load.state === "error")
    return (
      <p className="flow-guide-preset">
        Η λίστα Πελατών δεν φόρτωσε. Δοκίμασε ξανά σε λίγο.
      </p>
    );
  return (
    <RowList>
      {load.rows.map((client) => (
        <ListRow
          key={client.id}
          title={client.name}
          sub={client.packages}
          href={withQuery(stepHref(flow, step + 1), { client: client.id })}
        />
      ))}
      <ListRow
        title="Χωρίς ενεργή Συμφωνία — άνοιξε Συμφωνία"
        href={hrefOf("D1")}
        isFaded
      />
    </RowList>
  );
}
