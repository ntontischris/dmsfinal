"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { loadSentLine } from "./flow-egkrino-rows";

const SENT = "{sent}";

// Η πρόταση του βήματος. Το {sent} γίνεται «Στάλθηκαν N ώρες στον Πελάτη …» από το ?sent=&client= του σταθμού.
export function GuidePreset({ text }: { text: string }) {
  const search = useSearchParams();
  const sent = search.get("sent");
  const client = search.get("client");
  const hasSent = text.includes(SENT);
  const [line, setLine] = useState<{ key: string; text: string } | null>(null);
  const key = `${sent ?? ""}|${client ?? ""}`;
  useEffect(() => {
    if (!hasSent) return;
    let isLive = true;
    loadSentLine(sent, client)
      .then((value) => {
        if (isLive) setLine({ key, text: value });
      })
      .catch((error: unknown) => console.error("flows.sent:", error));
    return () => {
      isLive = false;
    };
  }, [hasSent, sent, client, key]);
  const filled = line?.key === key ? line.text : "";
  return (
    <p className="flow-guide-preset">
      {hasSent ? text.replace(SENT, filled) : text}
    </p>
  );
}
