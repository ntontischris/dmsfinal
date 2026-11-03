import { describe, expect, it } from "vitest";

import type {
  ClientAgreementCard,
  ClientPeriod,
  ClientProvision,
} from "../client-view-schema";
import type { ProposalDocument } from "../types";
import {
  balanceWordsOf,
  clientCardOf,
  clientPeriodRowOf,
  clientStatusOf,
  offerOf,
} from "./client-adapter";

const NBSP = String.fromCharCode(0xa0);
const euro = (text: string) => text.replaceAll(NBSP, " ");

const makeProvision = (
  overrides: Partial<ClientProvision> = {},
): ClientProvision => ({
  kindId: "k-reel",
  label: "reel",
  unit: "reels",
  given: 4,
  carried: 0,
  used: 1,
  reserved: 0,
  balance: 3,
  ...overrides,
});

const makePeriod = (overrides: Partial<ClientPeriod> = {}): ClientPeriod => ({
  n: 1,
  starts: "2026-11-01",
  ends: "2026-11-30",
  isPartial: false,
  state: "current",
  amount: 900,
  provisions: [makeProvision()],
  ...overrides,
});

const makeCard = (
  overrides: Partial<ClientAgreementCard> = {},
): ClientAgreementCard => ({
  id: "11111111-1111-4111-8111-111111111111",
  title: "Μηνιαίο Κυψέλη",
  kind: "monthly",
  language: "el",
  state: "active",
  sentAt: "2026-10-01T10:00:00+00:00",
  validUntil: null,
  startOn: "2026-11-01",
  endOn: "2027-10-31",
  durationMonths: 12,
  signedAt: "2026-10-05T10:00:00+00:00",
  net: 1000,
  current: makePeriod(),
  ...overrides,
});

describe("clientStatusOf", () => {
  it("η πρόταση περιμένει την υπογραφή, χωρίς εσωτερικά βήματα", () => {
    expect(clientStatusOf({ state: "proposal", startOn: null })).toBe(
      "Πρόταση: περιμένει την υπογραφή σας",
    );
  });
  it("υπογεγραμμένη με ημερομηνία έναρξης", () => {
    expect(clientStatusOf({ state: "signed", startOn: "2026-12-01" })).toBe(
      "Υπογεγραμμένη, ξεκινά 01/12/2026",
    );
  });
  it("ενεργή, έληξε, λύθηκε", () => {
    expect(clientStatusOf({ state: "active", startOn: null })).toBe("Ενεργή");
    expect(clientStatusOf({ state: "expired", startOn: null })).toBe("Έληξε");
    expect(clientStatusOf({ state: "dissolved", startOn: null })).toBe(
      "Λύθηκε",
    );
  });
});

describe("clientCardOf", () => {
  it("ενεργή: ποσό ανά μήνα, ο μήνας που τρέχει και ό,τι απομένει", () => {
    const view = clientCardOf(makeCard());
    expect(euro(view.amount ?? "")).toBe("1.000 € / μήνα");
    expect(view.kind).toBe("μηνιαία");
    expect(view.current).toEqual({
      label: "Νοέμβριος 2026",
      remaining: "3 reels",
    });
    expect(view.validUntil).toBeNull();
    expect(view.cta).toBe("Δες το πακέτο και τους όρους");
    expect(view.href).toContain("11111111-1111-4111-8111-111111111111");
  });
  it("πρόταση: «Ισχύει ως» και «Δες και υπόγραψε», χωρίς μήνα", () => {
    const view = clientCardOf(
      makeCard({ state: "proposal", validUntil: "2026-12-15", current: null }),
    );
    expect(view.isProposal).toBe(true);
    expect(view.validUntil).toBe("15/12/2026");
    expect(view.current).toBeNull();
    expect(view.cta).toBe("Δες και υπόγραψε");
  });
  it("εφάπαξ και χωρίς ποσό στο έγγραφο", () => {
    expect(
      euro(clientCardOf(makeCard({ kind: "one_off", net: 800 })).amount ?? ""),
    ).toBe("800 € εφάπαξ");
    expect(clientCardOf(makeCard({ net: null })).amount).toBeNull();
  });
  it("ένα που απομένει: ενικός", () => {
    const view = clientCardOf(
      makeCard({
        current: makePeriod({ provisions: [makeProvision({ balance: 1 })] }),
      }),
    );
    expect(view.current?.remaining).toBe("1 reel");
  });
  it("υπογεγραμμένη που δεν ξεκίνησε: χωρίς μήνα", () => {
    expect(clientCardOf(makeCard({ state: "signed" })).current).toBeNull();
  });
});

describe("balanceWordsOf", () => {
  it("με λόγια: δόθηκαν, έγιναν, κλεισμένα, μένουν", () => {
    expect(
      balanceWordsOf(
        makeProvision({ carried: 1, used: 2, reserved: 1, balance: 2 }),
      ),
    ).toBe(
      "reels: δόθηκαν 4 (+1 από τον προηγούμενο μήνα), έγιναν 2, 1 κλεισμένο, μένουν 2",
    );
  });
  it("ενικός: έγινε 1, μένει 1", () => {
    expect(
      balanceWordsOf(makeProvision({ given: 2, used: 1, balance: 1 })),
    ).toBe("reels: δόθηκαν 2, έγινε 1, μένει 1");
  });
});

describe("clientPeriodRowOf", () => {
  it("μήνας, ημερομηνίες, ποσό, κατάσταση με λόγια πελάτη", () => {
    const row = clientPeriodRowOf(makePeriod());
    expect(row.label).toBe("Νοέμβριος 2026");
    expect(row.dates).toBe("01/11/2026 – 30/11/2026");
    expect(euro(row.amount ?? "")).toBe("900 €");
    expect(row.state).toBe("τρέχει");
    expect(row.isCurrent).toBe(true);
    expect(row.balances).toEqual(["reels: δόθηκαν 4, έγινε 1, μένουν 3"]);
  });
  it("κλειστός και επόμενος", () => {
    expect(clientPeriodRowOf(makePeriod({ state: "closed" })).state).toBe(
      "έκλεισε",
    );
    expect(clientPeriodRowOf(makePeriod({ state: "next" })).state).toBe(
      "επόμενος",
    );
  });
});

describe("offerOf", () => {
  it("τα περισσότερα πρώτα, με τη μονάδα σε πεζά", () => {
    const document = {
      provisionTotals: [
        {
          label: "Γύρισμα",
          labelEn: "Shoot",
          unit: "Γυρίσματα",
          unitEn: "shoots",
          quantity: 2,
        },
        {
          label: "reel",
          labelEn: "Reel",
          unit: "reels",
          unitEn: "reels",
          quantity: 8,
        },
      ],
    } as Pick<ProposalDocument, "provisionTotals"> as ProposalDocument;
    expect(offerOf(document)).toBe("8 reels, 2 γυρίσματα");
  });
});
