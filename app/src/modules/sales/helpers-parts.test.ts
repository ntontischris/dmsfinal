import { describe, expect, it } from "vitest";

import {
  describeActivity,
  groupByStage,
  nextSort,
  parseRoutingValue,
  routingValue,
} from "./helpers";
import type { ActivityLookups, ActivityRow, ListItem, Opportunity } from "./types";

const UUID_A = "11111111-1111-4111-8111-111111111111";

const stage = (id: string, sort: number, isRetired = false): ListItem => ({
  id,
  code: null,
  label: id,
  sort,
  isSystem: false,
  isRetired,
});

const opportunity = (over: Partial<Opportunity>): Opportunity => ({
  id: "o1",
  clientId: "c1",
  clientName: "Πελάτης",
  clientManagerId: null,
  title: "Ευκαιρία",
  stageId: "s1",
  sourceId: "src",
  referredBy: "",
  managerId: null,
  managerName: null,
  outcome: "open",
  lossReasonId: null,
  nextStep: "Κλήση",
  nextStepDue: "2026-10-10",
  followsId: null,
  followsTitle: null,
  closedAt: null,
  createdAt: "2026-10-01T10:00:00Z",
  ...over,
});

const activity = (over: Partial<ActivityRow>): ActivityRow => ({
  id: "a1",
  opportunityId: "o1",
  opportunityTitle: null,
  occurredAt: "2026-10-01T10:00:00Z",
  actorName: null,
  kindId: null,
  event: null,
  body: "",
  previousId: null,
  subjectId: null,
  ...over,
});

const LOOKUPS: ActivityLookups = {
  stages: { s1: "Νέα", s2: "Πρώτη επαφή" },
  kinds: { k1: "Κλήση" },
  lossReasons: { r1: "Τιμή" },
  users: { u1: "Νίκος", u2: "Άννα" },
};

describe("groupByStage", () => {
  const stages = [stage("s2", 20), stage("s1", 10), stage("s3", 30, true)];
  it("ακολουθεί τη σειρά των Σταδίων και παραλείπει τα αποσυρμένα", () => {
    expect(groupByStage(stages, []).map((c) => c.stage.id)).toEqual([
      "s1",
      "s2",
    ]);
  });
  it("αγνοεί Ευκαιρίες που δεν είναι ανοιχτές", () => {
    const columns = groupByStage(stages, [
      opportunity({ id: "x", outcome: "lost" }),
    ]);
    expect(columns[0]?.cards).toEqual([]);
  });
  it("ταξινομεί κάθε στήλη με την προθεσμία: πρώτη η πιο παλιά", () => {
    const columns = groupByStage(stages, [
      opportunity({ id: "late", nextStepDue: "2026-12-01" }),
      opportunity({ id: "old", nextStepDue: "2026-01-01" }),
    ]);
    expect(columns[0]?.cards.map((c) => c.id)).toEqual(["old", "late"]);
  });
  it("πετά κάρτα με Στάδιο που δεν είναι ενεργό", () => {
    const columns = groupByStage(stages, [
      opportunity({ id: "gone", stageId: "s3" }),
    ]);
    expect(columns.flatMap((c) => c.cards)).toEqual([]);
  });
});

describe("describeActivity", () => {
  it("χειροκίνητη: είδος και κείμενο", () => {
    expect(
      describeActivity(activity({ kindId: "k1", body: "Μίλησαν" }), LOOKUPS),
    ).toEqual({
      kind: "Κλήση",
      text: "Μίλησαν",
    });
  });
  it("χειροκίνητη με άγνωστο είδος", () => {
    expect(
      describeActivity(activity({ kindId: "zz", body: "x" }), LOOKUPS).kind,
    ).toBe("Δραστηριότητα");
  });
  it("δημιουργία", () => {
    expect(
      describeActivity(
        activity({ event: "created", subjectId: "s1" }),
        LOOKUPS,
      ),
    ).toEqual({
      kind: "σύστημα",
      text: "Η Ευκαιρία δημιουργήθηκε στο Στάδιο «Νέα».",
    });
  });
  it("αλλαγή Σταδίου", () => {
    const a = activity({
      event: "stage_changed",
      previousId: "s1",
      subjectId: "s2",
    });
    expect(describeActivity(a, LOOKUPS).text).toBe(
      "Αλλαγή Σταδίου: «Νέα» → «Πρώτη επαφή».",
    );
  });
  it("πρώτη ανάθεση", () => {
    const a = activity({ event: "assigned", subjectId: "u2" });
    expect(describeActivity(a, LOOKUPS).text).toBe("Ανατέθηκε στον/στην Άννα.");
  });
  it("μεταβίβαση", () => {
    const a = activity({
      event: "assigned",
      previousId: "u1",
      subjectId: "u2",
    });
    expect(describeActivity(a, LOOKUPS).text).toBe(
      "Μεταβιβάστηκε από Νίκος σε Άννα.",
    );
  });
  it("επιστροφή στην ουρά", () => {
    const a = activity({ event: "assigned", previousId: "u1" });
    expect(describeActivity(a, LOOKUPS).text).toBe(
      "Η Ευκαιρία γύρισε στην ουρά «Χωρίς υπεύθυνο».",
    );
  });
  it("απώλεια", () => {
    const a = activity({ event: "lost", subjectId: "r1" });
    expect(describeActivity(a, LOOKUPS).text).toBe("Έκλεισε ως χαμένη: Τιμή.");
  });
  it("άγνωστα id πέφτουν στην παύλα", () => {
    const a = activity({
      event: "stage_changed",
      previousId: "x",
      subjectId: "y",
    });
    expect(describeActivity(a, LOOKUPS).text).toBe(
      "Αλλαγή Σταδίου: «—» → «—».",
    );
  });
});

describe("nextSort", () => {
  it("δίνει max + 10", () => {
    expect(nextSort([{ sort: 10 }, { sort: 30 }])).toBe(40);
  });
  it("δίνει 10 για κενή λίστα", () => {
    expect(nextSort([])).toBe(10);
  });
});

describe("parseRoutingValue και routingValue", () => {
  it("αναγνωρίζει owner και queue", () => {
    expect(parseRoutingValue("owner")).toEqual({
      routing: "owner",
      assigneeId: null,
    });
    expect(parseRoutingValue("queue")).toEqual({
      routing: "queue",
      assigneeId: null,
    });
  });
  it("ένα uuid είναι συγκεκριμένο πρόσωπο", () => {
    expect(parseRoutingValue(UUID_A)).toEqual({
      routing: "person",
      assigneeId: UUID_A,
    });
  });
  it("κενό ή άγνωστο δίνει null", () => {
    expect(parseRoutingValue("")).toBeNull();
    expect(parseRoutingValue("x")).toBeNull();
  });
  it("το routingValue είναι το αντίστροφο", () => {
    expect(routingValue({ formRouting: "owner", formAssigneeId: null })).toBe(
      "owner",
    );
    expect(routingValue({ formRouting: "queue", formAssigneeId: null })).toBe(
      "queue",
    );
    expect(
      routingValue({ formRouting: "person", formAssigneeId: UUID_A }),
    ).toBe(UUID_A);
  });
});
