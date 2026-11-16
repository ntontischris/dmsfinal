// Ο γύρος της μέρας του «Ξεκινώ τη μέρα μου» στη μνήμη της καρτέλας: ποιες γραμμές πέρασαν από τη λίστα σήμερα,
// για το «Γραμμή n από N» του βήματος 2.

import { withRoundKeys, type XekinoRound } from "./xekino-rows";

const ROUND = "flows.xekino.round";
const ROUND_EVENT = "flows-xekino-round";

export const readRoundRaw = (): string => {
  try {
    return window.sessionStorage.getItem(ROUND) ?? "null";
  } catch {
    return "null";
  }
};

const isRound = (value: unknown): value is XekinoRound =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as XekinoRound).day === "string" &&
  Array.isArray((value as XekinoRound).keys) &&
  (value as XekinoRound).keys.every((key) => typeof key === "string");

export const parseRound = (raw: string): XekinoRound | null => {
  try {
    const value: unknown = JSON.parse(raw);
    return isRound(value) ? value : null;
  } catch {
    return null;
  }
};

const writeRaw = (raw: string | null): void => {
  try {
    if (raw === null) window.sessionStorage.removeItem(ROUND);
    else window.sessionStorage.setItem(ROUND, raw);
  } catch (error) {
    console.error("flows.xekino.round", error);
  }
  window.dispatchEvent(new Event(ROUND_EVENT));
};

// Οι γραμμές που φάνηκαν στη λίστα μπαίνουν στον γύρο (μία φορά η καθεμία).
export const addRoundKeys = (keys: readonly string[], day: string): void => {
  const current = parseRound(readRoundRaw());
  const next = withRoundKeys(current, keys, day);
  if (next.keys.length !== current?.keys.length || next.day !== current.day)
    writeRaw(JSON.stringify(next));
};

// «Τέλος» της μέρας: ο επόμενος γύρος ξεκινά από την αρχή.
export const clearRound = (): void => writeRaw(null);

export const subscribeRound = (onChange: () => void): (() => void) => {
  window.addEventListener(ROUND_EVENT, onChange);
  return () => window.removeEventListener(ROUND_EVENT, onChange);
};
