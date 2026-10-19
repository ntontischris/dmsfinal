import { describe, expect, it } from "vitest";

import { demoLabels, readDemoLogins } from "./demo";

const LOGINS = JSON.stringify([
  { label: "Πωλήσεις", email: "sales@example.com" },
  { label: "Πελάτης", email: "client@example.com" },
]);

describe("είσοδος επίδειξης", () => {
  it("δίνει τους λογαριασμούς όταν υπάρχουν λίστα και κωδικός", () => {
    const env = { DEMO_LOGINS: LOGINS, DEMO_LOGIN_PASSWORD: "κάτι-μακρύ" };
    expect(readDemoLogins(env)).toEqual([
      { label: "Πωλήσεις", email: "sales@example.com" },
      { label: "Πελάτης", email: "client@example.com" },
    ]);
    expect(demoLabels(env)).toEqual(["Πωλήσεις", "Πελάτης"]);
  });

  it("μένει κλειστή χωρίς κωδικό ή χωρίς λίστα", () => {
    expect(readDemoLogins({ DEMO_LOGINS: LOGINS })).toEqual([]);
    expect(readDemoLogins({ DEMO_LOGIN_PASSWORD: "κάτι-μακρύ" })).toEqual([]);
    expect(readDemoLogins({})).toEqual([]);
  });

  it("μένει κλειστή όταν η λίστα δεν είναι έγκυρη", () => {
    const password = { DEMO_LOGIN_PASSWORD: "κάτι-μακρύ" };
    expect(readDemoLogins({ ...password, DEMO_LOGINS: "όχι json" })).toEqual([]);
    expect(readDemoLogins({ ...password, DEMO_LOGINS: '[{"label":"Χ","email":"όχι-email"}]' })).toEqual([]);
  });
});
